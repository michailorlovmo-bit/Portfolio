from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import sqlite3
import os
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-in-production'

DATABASE = 'ecommerce.db'

# Database helper functions
def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database with tables and sample data"""
    conn = get_db()
    cursor = conn.cursor()

    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            is_admin BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Create products table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            category TEXT,
            stock INTEGER DEFAULT 0,
            image_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Create orders table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            total REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    # Create order_items table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders (id),
            FOREIGN KEY (product_id) REFERENCES products (id)
        )
    ''')

    # Insert sample admin user (username: admin, password: admin123)
    try:
        cursor.execute('''
            INSERT INTO users (username, email, password, is_admin)
            VALUES (?, ?, ?, ?)
        ''', ('admin', 'admin@techstore.com', generate_password_hash('admin123'), 1))
    except sqlite3.IntegrityError:
        pass  # Admin already exists

    # Insert sample products
    sample_products = [
        ('Wireless Headphones', 'Premium noise-cancelling wireless headphones with 30-hour battery life', 199.99, 'Electronics', 50, 'https://via.placeholder.com/300x300?text=Headphones'),
        ('Laptop Stand', 'Ergonomic aluminum laptop stand with adjustable height', 49.99, 'Accessories', 100, 'https://via.placeholder.com/300x300?text=Laptop+Stand'),
        ('Mechanical Keyboard', 'RGB backlit mechanical keyboard with cherry switches', 129.99, 'Electronics', 75, 'https://via.placeholder.com/300x300?text=Keyboard'),
        ('Wireless Mouse', 'Ergonomic wireless mouse with precision sensor', 39.99, 'Electronics', 120, 'https://via.placeholder.com/300x300?text=Mouse'),
        ('USB-C Hub', '7-in-1 USB-C hub with HDMI, USB 3.0, and card reader', 59.99, 'Accessories', 80, 'https://via.placeholder.com/300x300?text=USB-C+Hub'),
        ('Webcam HD', '1080p HD webcam with built-in microphone', 79.99, 'Electronics', 60, 'https://via.placeholder.com/300x300?text=Webcam'),
        ('Phone Stand', 'Adjustable phone stand for desk', 19.99, 'Accessories', 150, 'https://via.placeholder.com/300x300?text=Phone+Stand'),
        ('Monitor', '27-inch 4K UHD monitor with HDR support', 399.99, 'Electronics', 30, 'https://via.placeholder.com/300x300?text=Monitor'),
        ('Desk Lamp', 'LED desk lamp with adjustable brightness and color temperature', 44.99, 'Accessories', 90, 'https://via.placeholder.com/300x300?text=Desk+Lamp'),
    ]

    for product in sample_products:
        try:
            cursor.execute('''
                INSERT INTO products (name, description, price, category, stock, image_url)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', product)
        except sqlite3.IntegrityError:
            pass  # Product already exists

    conn.commit()
    conn.close()

# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))

        conn = get_db()
        user = conn.execute('SELECT is_admin FROM users WHERE id = ?',
                          (session['user_id'],)).fetchone()
        conn.close()

        if not user or not user['is_admin']:
            return jsonify({'error': 'Unauthorized'}), 403

        return f(*args, **kwargs)
    return decorated_function

# Routes
@app.route('/')
def index():
    conn = get_db()
    products = conn.execute('SELECT * FROM products ORDER BY created_at DESC LIMIT 8').fetchall()
    conn.close()
    return render_template('index.html', products=products)

@app.route('/products')
def products():
    category = request.args.get('category', '')
    search = request.args.get('search', '')

    conn = get_db()

    if category:
        products = conn.execute('SELECT * FROM products WHERE category = ?',
                              (category,)).fetchall()
    elif search:
        products = conn.execute('SELECT * FROM products WHERE name LIKE ? OR description LIKE ?',
                              (f'%{search}%', f'%{search}%')).fetchall()
    else:
        products = conn.execute('SELECT * FROM products').fetchall()

    categories = conn.execute('SELECT DISTINCT category FROM products').fetchall()
    conn.close()

    return render_template('products.html', products=products, categories=categories)

@app.route('/product/<int:product_id>')
def product_detail(product_id):
    conn = get_db()
    product = conn.execute('SELECT * FROM products WHERE id = ?', (product_id,)).fetchone()
    conn.close()

    if not product:
        return "Product not found", 404

    return render_template('product_detail.html', product=product)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')

        if not username or not email or not password:
            return jsonify({'error': 'All fields are required'}), 400

        conn = get_db()

        # Check if user exists
        existing_user = conn.execute('SELECT id FROM users WHERE username = ? OR email = ?',
                                    (username, email)).fetchone()

        if existing_user:
            conn.close()
            return jsonify({'error': 'Username or email already exists'}), 400

        # Create user
        hashed_password = generate_password_hash(password)
        cursor = conn.cursor()
        cursor.execute('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                      (username, email, hashed_password))
        conn.commit()

        user_id = cursor.lastrowid
        conn.close()

        session['user_id'] = user_id
        session['username'] = username

        return jsonify({'success': True, 'message': 'Registration successful'})

    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400

        conn = get_db()
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        conn.close()

        if not user or not check_password_hash(user['password'], password):
            return jsonify({'error': 'Invalid username or password'}), 401

        session['user_id'] = user['id']
        session['username'] = user['username']
        session['is_admin'] = user['is_admin']

        return jsonify({'success': True, 'message': 'Login successful', 'is_admin': user['is_admin']})

    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

@app.route('/cart')
def cart():
    return render_template('cart.html')

@app.route('/api/cart', methods=['GET'])
def get_cart():
    cart = session.get('cart', {})

    if not cart:
        return jsonify({'items': [], 'total': 0})

    conn = get_db()
    cart_items = []
    total = 0

    for product_id, quantity in cart.items():
        product = conn.execute('SELECT * FROM products WHERE id = ?', (product_id,)).fetchone()
        if product:
            item = dict(product)
            item['quantity'] = quantity
            item['subtotal'] = product['price'] * quantity
            cart_items.append(item)
            total += item['subtotal']

    conn.close()

    return jsonify({'items': cart_items, 'total': total})

@app.route('/api/cart/add', methods=['POST'])
def add_to_cart():
    data = request.get_json()
    product_id = str(data.get('product_id'))
    quantity = int(data.get('quantity', 1))

    if 'cart' not in session:
        session['cart'] = {}

    cart = session['cart']

    if product_id in cart:
        cart[product_id] += quantity
    else:
        cart[product_id] = quantity

    session['cart'] = cart

    return jsonify({'success': True, 'message': 'Product added to cart'})

@app.route('/api/cart/update', methods=['POST'])
def update_cart():
    data = request.get_json()
    product_id = str(data.get('product_id'))
    quantity = int(data.get('quantity'))

    if 'cart' not in session:
        return jsonify({'error': 'Cart is empty'}), 400

    cart = session['cart']

    if quantity <= 0:
        cart.pop(product_id, None)
    else:
        cart[product_id] = quantity

    session['cart'] = cart

    return jsonify({'success': True})

@app.route('/api/cart/remove', methods=['POST'])
def remove_from_cart():
    data = request.get_json()
    product_id = str(data.get('product_id'))

    if 'cart' in session:
        cart = session['cart']
        cart.pop(product_id, None)
        session['cart'] = cart

    return jsonify({'success': True})

@app.route('/checkout', methods=['GET', 'POST'])
@login_required
def checkout():
    if request.method == 'POST':
        cart = session.get('cart', {})

        if not cart:
            return jsonify({'error': 'Cart is empty'}), 400

        conn = get_db()
        cursor = conn.cursor()

        # Calculate total
        total = 0
        cart_items = []

        for product_id, quantity in cart.items():
            product = conn.execute('SELECT * FROM products WHERE id = ?', (product_id,)).fetchone()
            if product:
                if product['stock'] < quantity:
                    conn.close()
                    return jsonify({'error': f'Insufficient stock for {product["name"]}'}), 400

                cart_items.append({
                    'product_id': product_id,
                    'quantity': quantity,
                    'price': product['price']
                })
                total += product['price'] * quantity

        # Create order
        cursor.execute('INSERT INTO orders (user_id, total, status) VALUES (?, ?, ?)',
                      (session['user_id'], total, 'completed'))
        order_id = cursor.lastrowid

        # Create order items and update stock
        for item in cart_items:
            cursor.execute('''
                INSERT INTO order_items (order_id, product_id, quantity, price)
                VALUES (?, ?, ?, ?)
            ''', (order_id, item['product_id'], item['quantity'], item['price']))

            cursor.execute('UPDATE products SET stock = stock - ? WHERE id = ?',
                         (item['quantity'], item['product_id']))

        conn.commit()
        conn.close()

        # Clear cart
        session['cart'] = {}

        return jsonify({'success': True, 'order_id': order_id, 'message': 'Order placed successfully'})

    return render_template('checkout.html')

@app.route('/orders')
@login_required
def orders():
    conn = get_db()
    orders = conn.execute('''
        SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC
    ''', (session['user_id'],)).fetchall()
    conn.close()

    return render_template('orders.html', orders=orders)

@app.route('/admin')
@admin_required
def admin():
    conn = get_db()
    products = conn.execute('SELECT * FROM products').fetchall()
    orders = conn.execute('''
        SELECT o.*, u.username FROM orders o
        JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
    ''').fetchall()
    conn.close()

    return render_template('admin.html', products=products, orders=orders)

@app.route('/api/admin/products', methods=['POST'])
@admin_required
def add_product():
    data = request.get_json()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO products (name, description, price, category, stock, image_url)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (data['name'], data['description'], data['price'],
          data['category'], data['stock'], data['image_url']))
    conn.commit()

    product_id = cursor.lastrowid
    conn.close()

    return jsonify({'success': True, 'product_id': product_id})

@app.route('/api/admin/products/<int:product_id>', methods=['PUT'])
@admin_required
def update_product(product_id):
    data = request.get_json()

    conn = get_db()
    conn.execute('''
        UPDATE products
        SET name = ?, description = ?, price = ?, category = ?, stock = ?, image_url = ?
        WHERE id = ?
    ''', (data['name'], data['description'], data['price'],
          data['category'], data['stock'], data['image_url'], product_id))
    conn.commit()
    conn.close()

    return jsonify({'success': True})

@app.route('/api/admin/products/<int:product_id>', methods=['DELETE'])
@admin_required
def delete_product(product_id):
    conn = get_db()
    conn.execute('DELETE FROM products WHERE id = ?', (product_id,))
    conn.commit()
    conn.close()

    return jsonify({'success': True})

if __name__ == '__main__':
    if not os.path.exists(DATABASE):
        init_db()
    app.run(debug=True, port=5000)
