// Add to cart functionality
document.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', async function() {
        const productId = this.getAttribute('data-product-id');

        try {
            const response = await fetch('/api/cart/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    product_id: productId,
                    quantity: 1
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Show success message
                showMessage('Product added to cart!', 'success');

                // Update cart count
                updateCartCount();
            } else {
                showMessage(data.error || 'Failed to add to cart', 'error');
            }
        } catch (error) {
            showMessage('An error occurred', 'error');
        }
    });
});

// Add to cart from product detail page
const addToCartDetailBtn = document.querySelector('.add-to-cart-detail');
if (addToCartDetailBtn) {
    addToCartDetailBtn.addEventListener('click', async function() {
        const productId = this.getAttribute('data-product-id');
        const quantity = parseInt(document.getElementById('quantity').value);

        try {
            const response = await fetch('/api/cart/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    product_id: productId,
                    quantity: quantity
                }),
            });

            const data = await response.json();

            if (response.ok) {
                showMessage('Product added to cart!', 'success');
                updateCartCount();
            } else {
                showMessage(data.error || 'Failed to add to cart', 'error');
            }
        } catch (error) {
            showMessage('An error occurred', 'error');
        }
    });
}

// Load cart on cart page
async function loadCart() {
    try {
        const response = await fetch('/api/cart');
        const data = await response.json();

        const cartContent = document.getElementById('cart-content');
        const cartItems = document.getElementById('cart-items');
        const cartSummary = document.getElementById('cart-summary');
        const emptyCart = document.getElementById('empty-cart');

        if (!cartContent) return; // Not on cart page

        cartContent.style.display = 'none';

        if (data.items.length === 0) {
            emptyCart.style.display = 'block';
            return;
        }

        // Build cart items HTML
        let html = '';
        data.items.forEach(item => {
            html += `
                <div class="cart-item">
                    <img src="${item.image_url}" alt="${item.name}">
                    <div class="cart-item-info">
                        <h3>${item.name}</h3>
                        <p class="price">$${item.price.toFixed(2)}</p>
                    </div>
                    <div class="cart-item-quantity">
                        <input type="number" value="${item.quantity}" min="1" max="${item.stock}"
                               onchange="updateQuantity(${item.id}, this.value)">
                    </div>
                    <div class="cart-item-subtotal">
                        <strong>$${item.subtotal.toFixed(2)}</strong>
                    </div>
                    <div class="cart-item-remove">
                        <button class="btn btn-danger btn-small" onclick="removeFromCart(${item.id})">Remove</button>
                    </div>
                </div>
            `;
        });

        cartItems.innerHTML = html;
        cartItems.style.display = 'block';

        document.getElementById('cart-total').textContent = `$${data.total.toFixed(2)}`;
        cartSummary.style.display = 'block';

    } catch (error) {
        console.error('Error loading cart:', error);
    }
}

// Update quantity
async function updateQuantity(productId, quantity) {
    try {
        const response = await fetch('/api/cart/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                product_id: productId.toString(),
                quantity: parseInt(quantity)
            }),
        });

        if (response.ok) {
            loadCart();
            updateCartCount();
        }
    } catch (error) {
        console.error('Error updating cart:', error);
    }
}

// Remove from cart
async function removeFromCart(productId) {
    try {
        const response = await fetch('/api/cart/remove', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                product_id: productId.toString()
            }),
        });

        if (response.ok) {
            loadCart();
            updateCartCount();
        }
    } catch (error) {
        console.error('Error removing from cart:', error);
    }
}

// Show message helper
function showMessage(message, type) {
    const messageEl = document.getElementById('message');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = `message ${type}`;

        setTimeout(() => {
            messageEl.className = 'message';
        }, 3000);
    }
}

// Update cart count helper
function updateCartCount() {
    fetch('/api/cart')
        .then(response => response.json())
        .then(data => {
            const cartCount = document.getElementById('cart-count');
            if (cartCount) {
                const totalItems = data.items.reduce((sum, item) => sum + item.quantity, 0);
                cartCount.textContent = totalItems;
            }
        })
        .catch(error => console.error('Error updating cart count:', error));
}
