let cart = JSON.parse(localStorage.getItem("cart")) || [];

function addToCart(productName, price, size, quantity, imageUrl) {
    // Validate the quantity input
    const quantityNumber = parseInt(quantity, 10); // Convert quantity to an integer
    console.log("addToCart called with:", { productName, price, size, quantity, imageUrl }); // ADDED

    if (quantityNumber <= 0 || isNaN(quantityNumber)) {
        alert('Please select a valid quantity!');
        return;  // Don't add to cart if the quantity is invalid
    }

    let product = cart.find(item => item.name === productName && item.size === size);

    if (product) {
        // If product exists, update its quantity
        product.quantity += quantityNumber;
        console.log("Product found, new quantity:", product.quantity); // ADDED
    } else {
        // If product doesn't exist, add a new entry
        cart.push({ name: productName, price: price, size: size, quantity: quantityNumber, imageUrl: imageUrl });
        console.log("Product added to cart:", { productName, price, size, quantityNumber, imageUrl }); // ADDED
    }

    // Store the updated cart in localStorage
    localStorage.setItem("cart", JSON.stringify(cart));

    // Update cart count and render the cart
    updateCartCount();
    renderCart();
}

function removeFromCart(productName, size) {
    console.log("removeFromCart called with:", { productName, size });  // ADDED
    // Find and remove the product from the cart by its name and size
    const productIndex = cart.findIndex(item => item.name === productName && item.size === size);
    console.log("Product index:", productIndex); // ADDED

    if (productIndex !== -1) {
        cart.splice(productIndex, 1); // Remove product from cart
        localStorage.setItem("cart", JSON.stringify(cart)); // Update cart in localStorage
        console.log("Product removed. New cart:", cart); // ADDED
    } else {
        console.log("Product not found in cart."); // ADDED
    }

    // Re-render the cart after removal
    renderCart();
}

function renderCart() {
    const cartContainer = document.getElementById('cart-container');
    cartContainer.innerHTML = ''; // Clear the current cart display
    console.log("renderCart called. Current cart:", cart); // ADDED

    // If the cart is empty, display an empty message
    if (cart.length === 0) {
        cartContainer.innerHTML = "<p>Your cart is empty</p>";
        return;
    }

    let totalPrice = 0;

    cart.forEach(item => {
        // Dynamically create cart items
        const cartItem = document.createElement('div');
        cartItem.classList.add('cart-item');

        // HTML structure for each cart item
        cartItem.innerHTML = `
                <div class="item-details">
                    <img src="${images/}" alt="${item.name}" style="width: 100px; height: auto;">
                    <h3>${item.name} (${item.size})</h3>
                    <p>Ksh. ${item.price} x ${item.quantity}</p>
                </div>
                <button class="remove-item" onclick="removeFromCart('${item.name}', '${item.size}')">Remove</button>
            `;
    
        });

        // Append each cart item to the cart container
        cartContainer.appendChild(cartItem);

        // Add to total price
        totalPrice += item.price * item.quantity;
    };

    // Update the total price
    document.getElementById('total-price').innerText = `Total: Ksh. ${totalPrice}`;
    updateCartCount(); //ADDED THIS LINE.


function updateCartCount() {
    // Count total number of items in the cart
    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    console.log("updateCartCount.  Cart count:", cartCount); //ADDED
    // Update the cart count in the header
    document.getElementById('cart-count').innerText = cartCount;
}

window.onload = function () {
    renderCart();  // Render the cart on page load
    updateCartCount();  // Update cart count on page load
};
