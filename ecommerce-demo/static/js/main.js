// Update cart count on page load
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

// Call on page load
updateCartCount();
