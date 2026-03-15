import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { AppError } from '../errors/AppError.js';
import logger from '../logger/winston.config.js';

export const requireAdmin = async (req, res, next) => {
    try {
        if (!isSupabaseConfigured()) {
            throw new AppError('Authentication service unavailable', 503, 'AUTH_SERVICE_UNAVAILABLE');
        }

        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];

        if (!token) {
            throw new AppError('Missing authorization token', 401, 'ADMIN_AUTH_REQUIRED');
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            throw new AppError('Invalid or expired token', 401, 'ADMIN_AUTH_INVALID');
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (profileError) {
            throw new AppError('Failed to verify admin access', 500, 'ADMIN_AUTH_FAILED');
        }

        if (!profile?.is_admin) {
            throw new AppError('Admin access required', 403, 'ADMIN_REQUIRED');
        }

        req.user = user;
        return next();
    } catch (error) {
        if (error instanceof AppError) {
            return next(error);
        }

        logger.error('Admin auth error', { requestId: req.id, error: error.message });
        return next(new AppError('Admin authentication failed', 401, 'ADMIN_AUTH_FAILED'));
    }
};

export default requireAdmin;

