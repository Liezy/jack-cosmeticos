// Google Sheets CSV URL
const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS_D1_gmBTqWQa6Wvn7rkEA619VcDZBINQpn1w4JO_syR1EAmKQCqrYcdjVuw4rRTyp3kf8N_0K20yR/pub?output=csv';

// Products data (will be loaded from Google Sheets)
let products = [];

// Cart state
let cart = [];

// Parse CSV to JSON
function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    return lines.slice(1).map(line => {
        // Handle CSV with quotes and commas properly
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index]?.replace(/^"|"$/g, '') || '';
        });
        
        return {
            id: parseInt(obj.id) || 0,
            name: obj.nome || 'Produto sem nome',
            description: obj.descricao || 'Sem descrição',
            price: parseFloat(obj.preco) || 0,
            image: obj.imagem || ''
        };
    }).filter(product => product.id > 0); // Remove produtos inválidos
}

// Load products from Google Sheets
async function loadProductsFromSheet() {
    try {
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const response = await fetch(`${SPREADSHEET_URL}&_=${timestamp}`, {
            cache: 'no-store'
        });
        const csv = await response.text();
        products = parseCSV(csv);
        loadProducts();
    } catch (error) {
        console.error('Erro ao carregar produtos da planilha:', error);
        // Fallback: mostrar mensagem de erro
        const grid = document.getElementById('products-grid');
        grid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-exclamation-triangle text-6xl text-red-400 mb-4"></i>
                <p class="text-gray-600 text-lg">Erro ao carregar produtos. Tente novamente mais tarde.</p>
            </div>
        `;
    }
}

// Load products on page load
document.addEventListener('DOMContentLoaded', () => {
    loadProductsFromSheet();
    loadCartFromStorage();
    updateCartUI();
    setupEventListeners();
});

// Load products into grid
function loadProducts() {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = products.map(product => `
        <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition duration-300 transform hover:-translate-y-1 border-2 border-transparent hover:border-jack-rose">
            <div class="relative pb-[100%] bg-gray-200">
                <img src="${product.image}" alt="${product.name}" class="absolute inset-0 w-full h-full object-cover">
            </div>
            <div class="p-4">
                <h3 class="text-lg font-bold text-jack-burgundy mb-2">${product.name}</h3>
                <p class="text-sm text-gray-600 mb-3 line-clamp-2">${product.description}</p>
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <span class="text-xl sm:text-2xl font-bold text-jack-burgundy">R$ ${product.price.toFixed(2)}</span>
                    <button onclick="addToCart(${product.id})" class="w-full sm:w-auto bg-gradient-to-r from-jack-burgundy to-jack-brown text-white px-4 py-2 rounded-lg font-semibold hover:from-jack-mauve hover:to-jack-rose transition duration-300 shadow-md text-sm sm:text-base">
                        <i class="fas fa-cart-plus mr-1"></i>
                        Adicionar
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Add product to cart
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }

    saveCartToStorage();
    updateCartUI();
    showAddedAnimation();
    showToast(product.name, product.image);
}

// Remove product from cart
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCartToStorage();
    updateCartUI();
}

// Update cart UI
function updateCartUI() {
    const cartCount = document.getElementById('cart-count');
    const floatingCartCount = document.getElementById('floating-cart-count');
    const cartItems = document.getElementById('cart-items');
    const emptyCart = document.getElementById('empty-cart');
    const cartTotal = document.getElementById('cart-total');

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    cartCount.textContent = totalItems;
    floatingCartCount.textContent = totalItems;

    if (cart.length === 0) {
        cartItems.classList.add('hidden');
        emptyCart.classList.remove('hidden');
    } else {
        cartItems.classList.remove('hidden');
        emptyCart.classList.add('hidden');
        
        cartItems.innerHTML = cart.map(item => `
            <div class="flex items-center gap-3 sm:gap-4 bg-gray-50 p-3 sm:p-4 rounded-lg">
                <img src="${item.image}" alt="${item.name}" class="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg flex-shrink-0">
                <div class="flex-1 min-w-0">
                    <h4 class="font-semibold text-jack-burgundy text-sm sm:text-base truncate">${item.name}</h4>
                    <p class="text-xs sm:text-sm text-gray-600">R$ ${item.price.toFixed(2)} x ${item.quantity}</p>
                    <p class="text-jack-burgundy font-bold text-sm sm:text-base">R$ ${(item.price * item.quantity).toFixed(2)}</p>
                </div>
                <button onclick="removeFromCart(${item.id})" class="text-red-500 hover:text-red-700 transition px-2 py-2 flex-shrink-0">
                    <i class="fas fa-trash text-xl"></i>
                </button>
            </div>
        `).join('');
    }

    cartTotal.textContent = `R$ ${totalPrice.toFixed(2)}`;
}

// Setup event listeners
function setupEventListeners() {
    const cartBtn = document.getElementById('cart-btn');
    const floatingCartBtn = document.getElementById('floating-cart-btn');
    const closeModal = document.getElementById('close-modal');
    const cartModal = document.getElementById('cart-modal');
    const checkoutBtn = document.getElementById('checkout-btn');

    cartBtn.addEventListener('click', () => {
        cartModal.classList.remove('hidden');
    });

    floatingCartBtn.addEventListener('click', () => {
        cartModal.classList.remove('hidden');
    });

    closeModal.addEventListener('click', () => {
        cartModal.classList.add('hidden');
    });

    cartModal.addEventListener('click', (e) => {
        if (e.target === cartModal) {
            cartModal.classList.add('hidden');
        }
    });

    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) {
            alert('Seu carrinho está vazio!');
            return;
        }
        sendToWhatsApp();
    });
}

// Send order to WhatsApp
function sendToWhatsApp() {
    const phoneNumber = '5563984519814';
    let message = '*Ola! Gostaria de fazer um pedido:*\n\n';
    
    cart.forEach(item => {
        message += `*${item.name}*\n`;
        message += `Quantidade: ${item.quantity}\n`;
        message += `Preco unitario: R$ ${item.price.toFixed(2)}\n`;
        message += `Subtotal: R$ ${(item.price * item.quantity).toFixed(2)}\n\n`;
    });

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    message += `*TOTAL: R$ ${total.toFixed(2)}*\n\n`;
    message += 'Aguardo confirmacao!';

    const encodedMessage = encodeURIComponent(message);
    const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    window.open(whatsappURL, '_blank');
}

// Save cart to localStorage
function saveCartToStorage() {
    localStorage.setItem('jack-cart', JSON.stringify(cart));
}

// Load cart from localStorage
function loadCartFromStorage() {
    const savedCart = localStorage.getItem('jack-cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
}

// Show animation when item is added
function showAddedAnimation() {
    const cartBtn = document.getElementById('cart-btn');
    const floatingCartBtn = document.getElementById('floating-cart-btn');
    
    cartBtn.classList.add('animate-bounce');
    floatingCartBtn.classList.add('animate-bounce');
    
    setTimeout(() => {
        cartBtn.classList.remove('animate-bounce');
        floatingCartBtn.classList.remove('animate-bounce');
    }, 500);
}

// Show toast notification
function showToast(productName, productImage) {
    const toastContainer = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = 'bg-white rounded-lg shadow-2xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3 w-full sm:min-w-[300px] transform transition-all duration-300 translate-x-[400px] border-l-4 border-jack-burgundy';
    
    toast.innerHTML = `
        <img src="${productImage}" alt="${productName}" class="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded flex-shrink-0">
        <div class="flex-1 min-w-0">
            <p class="text-xs sm:text-sm font-semibold text-jack-burgundy">Adicionado ao carrinho!</p>
            <p class="text-xs text-gray-600 truncate">${productName}</p>
        </div>
        <i class="fas fa-check-circle text-jack-burgundy text-xl sm:text-2xl flex-shrink-0"></i>
    `;
    
    toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        toast.style.opacity = '0';
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 300);
    }, 3000);
}
