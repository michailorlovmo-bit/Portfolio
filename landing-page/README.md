# Modern Landing Page

A responsive, modern landing page built with HTML, CSS, and JavaScript. Features smooth animations, mobile-friendly design, and interactive elements.

## Features

- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Smooth Animations**: Fade-in effects, floating elements, and scroll animations
- **Interactive Navigation**: Mobile hamburger menu with smooth transitions
- **Contact Form**: Functional form with validation
- **Animated Statistics**: Counter animations that trigger on scroll
- **Modern UI**: Clean, professional design with gradient backgrounds
- **Smooth Scrolling**: Smooth scroll navigation between sections

## Technologies Used

- HTML5
- CSS3 (Flexbox, Grid, Animations)
- Vanilla JavaScript (ES6+)
- Intersection Observer API
- CSS Custom Properties (Variables)

## Sections

1. **Hero Section**: Eye-catching hero with call-to-action buttons
2. **Features**: Grid of feature cards with icons
3. **About**: Company information with animated statistics
4. **Contact**: Contact form and business information
5. **Footer**: Links and social media

## Setup

Simply open `index.html` in your web browser, or use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (http-server)
npx http-server
```

Then navigate to `http://localhost:8000`

## Customization

### Colors

Edit CSS variables in `css/style.css`:

```css
:root {
    --primary-color: #6366f1;
    --primary-dark: #4f46e5;
    --secondary-color: #10b981;
    /* ... */
}
```

### Content

Update the HTML content in `index.html` to match your business or product.

### Features

Modify the features grid in the Features section to showcase your specific offerings.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance

- Lightweight: No external dependencies
- Fast loading: Optimized CSS and JavaScript
- Smooth animations: Hardware-accelerated transforms
- Lazy loading: Animations trigger on scroll

## Future Enhancements

- Add form backend integration
- Implement dark mode toggle
- Add more interactive elements
- Include image gallery
- Add testimonials section

## License

MIT License - Free to use for portfolio and commercial projects.
