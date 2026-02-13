import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
});

// Price IDs for each plan (create these in Stripe Dashboard → Products)
const PRICE_IDS = {
    pro: process.env.STRIPE_PRO_PRICE_ID,
    team: process.env.STRIPE_TEAM_PRICE_ID,
};

// Create a Stripe Checkout Session
router.post('/create-checkout-session', async (req, res) => {
    try {
        const { plan, userId, userEmail } = req.body;

        if (!plan || !['pro', 'team'].includes(plan)) {
            return res.status(400).json({ error: 'Invalid plan. Must be "pro" or "team".' });
        }

        if (!PRICE_IDS[plan]) {
            return res.status(500).json({ error: `Price ID not configured for ${plan} plan. Set STRIPE_${plan.toUpperCase()}_PRICE_ID in .env` });
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            customer_email: userEmail,
            line_items: [
                {
                    price: PRICE_IDS[plan],
                    quantity: 1,
                },
            ],
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/#?upgrade=success&plan=${plan}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/#?upgrade=cancelled`,
            metadata: {
                userId,
                plan,
            },
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Stripe Webhook — handles payment completion
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        if (webhookSecret) {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } else {
            // In development without webhook secret, parse directly
            event = JSON.parse(req.body);
        }
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle checkout completion
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const { userId, plan } = session.metadata;

        console.log(`✅ Payment successful! Upgrading user ${userId} to ${plan}`);

        try {
            // Update user plan in Supabase
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            const { error } = await supabase
                .from('profiles')
                .update({ plan: plan, stripe_customer_id: session.customer })
                .eq('id', userId);

            if (error) {
                console.error('Failed to update plan in Supabase:', error);
            } else {
                console.log(`✅ User ${userId} upgraded to ${plan} successfully`);
            }
        } catch (dbError) {
            console.error('Database update error:', dbError);
        }
    }

    res.json({ received: true });
});

// Get current subscription status
router.get('/subscription-status/:userId', async (req, res) => {
    try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data, error } = await supabase
            .from('profiles')
            .select('plan, stripe_customer_id')
            .eq('id', req.params.userId)
            .single();

        if (error) throw error;

        res.json({ plan: data?.plan || 'free', hasStripeCustomer: !!data?.stripe_customer_id });
    } catch (error) {
        console.error('Subscription status error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
