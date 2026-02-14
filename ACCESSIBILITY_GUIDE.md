# Accessibility Improvements - Implementation Guide

## Components to Update

### 1. AuthView.tsx
- Add `aria-label` to all icon buttons (Google, Phone buttons)
- Add `aria-describedby` for form error messages
- Add `role="alert"` to error/success messages
- Ensure form labels are properly associated with inputs
- Add `aria-busy` to loading buttons

### 2. MeetingDetail.tsx
- Add `aria-label` to PDF export menu toggle button
- Add `aria-expanded` to dropdown menu
- Add `aria-live="polite"` to chat messages container
- Add `aria-label` to share button and other controls
- Add `aria-label="Close menu"` to modal overlays

### 3. Dashboard.tsx
- Add `aria-label` to Google Drive picker button
- Add `aria-label` to file upload button
- Add `aria-label="Search meetings"` to search input
- Add `role="main"` to main content area
- Add `aria-live="assertive"` for upload status

### 4. CalendarSync.tsx
- Add `aria-label` to Google and Outlook connection buttons
- Add `aria-describedby` to event items with status info
- Add `role="status"` to sync status messages
- Add `aria-label="Connect [service]"` to OAuth buttons

### 5. RecordingSession.tsx
- Add `aria-live="assertive"` to recording status
- Add `aria-label="Start recording"` / `"Stop recording"`
- Add `aria-describedby` for duration and status
- Add `role="status"` to timer display

### 6. Navigation (Sidebar & BottomNav)
- Add `aria-label` to icon-only navigation buttons
- Use `aria-current="page"` for active nav item
- Add `role="navigation"` to nav containers
- Add keyboard focus indicators (outline or border)

### 7. SharedView.tsx
- Add `aria-label` to filter/sort buttons
- Add `aria-live="polite"` to shared items list
- Add `aria-label` to permission indicators

## General Improvements

### Semantic HTML
- Use `<button>` instead of `<div onClick>` where applicable
- Use `<nav>` for navigation (already done in some places)
- Use proper heading hierarchy (`<h1>`, `<h2>`, etc.)
- Use `<label>` elements for form inputs (many already done)

### Focus Management
- Add visible focus indicators (outline or border on focus)
- Use `Tab` key to navigate all interactive elements
- Add skip links for main content (optional but helpful)

### Form Validation
- Use `aria-invalid="true"` on invalid inputs
- Use `aria-describedby` to link inputs to error messages
- Use `aria-required="true"` on required fields

### Loading States
- Use `aria-busy="true"` on buttons during loading
- Add `aria-label` with current action status
- Update `aria-live` regions with progress feedback

## Implementation Priority

1. **High Priority** (affects core functionality):
   - AuthView form labels and error messages
   - MeetingDetail chat and controls
   - Dashboard main content and buttons

2. **Medium Priority** (improves usability):
   - Navigation ARIA labels and current page indicator
   - RecordingSession status and controls
   - CalendarSync connection buttons

3. **Low Priority** (nice to have):
   - Skip links
   - Extended keyboard support
   - Advanced focus management

## Testing Checklist

- [ ] Use axe DevTools browser extension to check for issues
- [ ] Test with keyboard only navigation (Tab, Enter, Escape)
- [ ] Test with screen reader (NVDA on Windows, Voiceover on Mac)
- [ ] Verify all form errors are announced to screen readers
- [ ] Verify interactive elements have proper labels
- [ ] Verify focus is visible and logical
- [ ] Verify color is not the only way to convey information

## Resources

- ARIA Authoring Practices Guide: https://www.w3.org/WAI/ARIA/apg/
- WebAIM Screen Reader Testing: https://webaim.org/articles/screenreader_testing/
- axe DevTools: https://www.deque.com/axe/devtools/
