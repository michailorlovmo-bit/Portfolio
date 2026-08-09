# E-Commerce Demo - TechStore

A full-stack e-commerce application built with Python Flask backend and vanilla JavaScript frontend. Features product catalog, shopping cart, user authentication, and admin panel.

## Features

### Customer Features
- **Product Catalog**: Browse products with search and category filtering
- **Product Details**: View detailed product information
- **Shopping Cart**: Add, update, and remove items from cart
- **User Authentication**: Register and login functionality
- **Checkout**: Place orders with form validation
- **Order History**: View past orders

### Admin Features
- **Product Management**: Add, update, and delete products
- **Order Management**: View all customer orders
- **Admin Dashboard**: Comprehensive overview of products and orders

## Tech Stack

### Backend
- **Python 3.8+**
- **Flask**: Web framework
- **SQLite**: Database
- **Werkzeug**: Password hashing and security

### Frontend
- **HTML5/CSS3**: Modern responsive design
- **Vanilla JavaScript**: No framework dependencies
- **Fetch API**: Asynchronous requests

## Project Structure

```
ecommerce-demo/
├── app.py                 # Main Flask application
├── ecommerce.db          # SQLite database (created on first run)
├── requirements.txt      # Python dependencies
├── static/
│   ├── css/
│   │   └── style.css    # Styles
│   └── js/
│       ├── main.js      # Main JavaScript
│       └── cart.js      # Cart functionality
└── templates/           # HTML templates
    ├── base.html
    ├── index.html
    ├── products.html
    ├── product_detail.html
    ├── cart.html
    ├── login.html
    ├── register.html
    ├── checkout.html
    ├── orders.html
    └── admin.html
```

## Setup and Installation

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Installation Steps

1. **Navigate to project directory**
   ```bash
   cd ecommerce-demo
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   ```

3. **Activate virtual environment**
   ```bash
   # On Linux/Mac:
   source venv/bin/activate

   # On Windows:
   venv\Scripts\activate
   ```

4. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

5. **Run the application**
   ```bash
   python app.py
   ```

6. **Access the application**
   - Open your browser and navigate to: `http://localhost:5000`

## Default Credentials

### Admin Account
- **Username**: admin
- **Password**: admin123

The admin account has access to the admin panel at `/admin` where you can manage products and view orders.

## Database

The application uses SQLite for simplicity. On first run, the database is automatically initialized with:
- Sample products (9 tech accessories)
- Admin user account
- Required tables (users, products, orders, order_items)

## API Endpoints

### Public Endpoints
- `GET /` - Home page
- `GET /products` - Product listing
- `GET /product/<id>` - Product detail
- `POST /register` - User registration
- `POST /login` - User login
- `GET /logout` - User logout

### Cart API
- `GET /api/cart` - Get cart contents
- `POST /api/cart/add` - Add item to cart
- `POST /api/cart/update` - Update item quantity
- `POST /api/cart/remove` - Remove item from cart

### Protected Endpoints (Requires Login)
- `GET /checkout` - Checkout page
- `POST /checkout` - Place order
- `GET /orders` - View user orders

### Admin Endpoints (Requires Admin Role)
- `GET /admin` - Admin dashboard
- `POST /api/admin/products` - Add product
- `PUT /api/admin/products/<id>` - Update product
- `DELETE /api/admin/products/<id>` - Delete product

## Features Implemented

### Security
- Password hashing using Werkzeug
- Session-based authentication
- CSRF protection (Flask sessions)
- Input validation on forms

### Database Design
- Normalized database structure
- Foreign key relationships
- Transaction handling for orders

### UI/UX
- Responsive design (mobile-friendly)
- Clean, modern interface
- Real-time cart updates
- Form validation
- Success/error messages

## Future Enhancements

- Payment gateway integration
- Email notifications
- Product reviews and ratings
- Advanced search with filters
- Inventory management
- Order tracking
- Wishlist functionality
- Product images upload
- Multi-currency support
- Discount codes/coupons

## Development Notes

### Session Management
- Sessions are stored server-side
- Cart data persists in session
- Secure session configuration needed for production

### Production Deployment
Before deploying to production:
1. Change `app.secret_key` to a secure random value
2. Set `debug=False` in `app.run()`
3. Use a production WSGI server (gunicorn, uwsgi)
4. Configure HTTPS
5. Use PostgreSQL instead of SQLite
6. Set up proper logging
7. Configure environment variables

### Running in Production

```bash
# Install gunicorn
pip install gunicorn

# Run with gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## License

MIT License - Free to use for portfolio and commercial projects.

## Portfolio Demo

This is a demonstration project built to showcase:
- Full-stack web development skills
- RESTful API design
- Database design and management
- User authentication and authorization
- E-commerce functionality
- Clean code practices
