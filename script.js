// API Configuration (dynamically set based on domain)
const API_CONFIG = {
    baseUrl: window.TOASTE_CONFIG?.apiBaseUrl || 'https://rest.toastebikepolo.ca/.netlify/functions'
};

// Wake up server function (for free plan)
async function wakeUpServer() {
    try {
        console.log('🌅 Waking up server...');
        const response = await fetch(`${API_CONFIG.baseUrl}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            console.log('✅ Server is awake and ready!');
        } else {
            console.log('⚠️ Server wake-up response not OK:', response.status);
        }
    } catch (error) {
        console.log('⚠️ Server wake-up failed (this is normal for free plan):', error.message);
    }
}

// Form elements
const productForm = document.getElementById('product-form');
const customerForm = document.getElementById('customer-form');
const productSection = document.getElementById('product-selection');
const contactSection = document.getElementById('contact-form');
const reviewSection = document.getElementById('order-review');
const confirmationSection = document.getElementById('confirmation');
const orderCodeSpan = document.getElementById('order-code');

// Button groups
const spokeCountGroup = document.getElementById('spoke-count-group');
const wheelSizeGroup = document.getElementById('wheel-size-group');
const spokeCountInput = document.getElementById('spoke-count');
const wheelSizeInput = document.getElementById('wheel-size');

// New cart elements
const cartSummary = document.getElementById('cart-summary');
const cartItems = document.getElementById('cart-items');
const totalPriceSpan = document.getElementById('total-price');
const quantityInput = document.getElementById('quantity');
const quantityMinusBtn = document.getElementById('quantity-minus');
const quantityPlusBtn = document.getElementById('quantity-plus');
const addToCartBtn = document.querySelector('.add-to-cart-btn');
// Continue button removed - using cart total button instead

// Review elements
const reviewContactInfo = document.getElementById('review-contact-info');
const reviewOrderItems = document.getElementById('review-order-items');
const reviewTotalPrice = document.getElementById('review-total-price');

// Store product selection
let selectedProducts = []; // Array of {spokeCount, wheelSize, quantity}
let currentProduct = {
    spokeCount: '',
    wheelSize: '',
    quantity: 1
};

// LocalStorage keys
const STORAGE_KEYS = {
    CART: 'toaste_cart',
    CONTACT_INFO: 'toaste_contact_info',
    CURRENT_PRODUCT: 'toaste_current_product'
};

// Load cart from localStorage on page load
function loadCartFromStorage() {
    try {
        const savedCart = localStorage.getItem(STORAGE_KEYS.CART);
        if (savedCart) {
            selectedProducts = JSON.parse(savedCart);
            updateCartDisplay();
        }
        
        // Load current product state
        const savedCurrentProduct = localStorage.getItem(STORAGE_KEYS.CURRENT_PRODUCT);
        if (savedCurrentProduct) {
            const productData = JSON.parse(savedCurrentProduct);
            currentProduct = { ...currentProduct, ...productData };
            
            // Update form display
            if (currentProduct.spokeCount) {
                const spokeBtn = document.querySelector(`[data-value="${currentProduct.spokeCount}"]`);
                if (spokeBtn) {
                    handleOptionClick(spokeCountGroup, spokeCountInput, currentProduct.spokeCount);
                }
            }
            if (currentProduct.wheelSize) {
                const wheelBtn = document.querySelector(`[data-value="${currentProduct.wheelSize}"]`);
                if (wheelBtn) {
                    handleOptionClick(wheelSizeGroup, wheelSizeInput, currentProduct.wheelSize);
                }
            }
            quantityInput.value = currentProduct.quantity;
        }
    } catch (error) {
        console.error('Error loading cart from storage:', error);
    }
}

// Save cart to localStorage
function saveCartToStorage() {
    try {
        localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(selectedProducts));
    } catch (error) {
        console.error('Error saving cart to storage:', error);
    }
}

// Save current product state to localStorage
function saveCurrentProductToStorage() {
    try {
        localStorage.setItem(STORAGE_KEYS.CURRENT_PRODUCT, JSON.stringify(currentProduct));
    } catch (error) {
        console.error('Error saving current product to storage:', error);
    }
}

// Load contact info from localStorage
function loadContactInfoFromStorage() {
    try {
        const savedContactInfo = localStorage.getItem(STORAGE_KEYS.CONTACT_INFO);
        if (savedContactInfo) {
            const contactInfo = JSON.parse(savedContactInfo);
            document.getElementById('name').value = contactInfo.name || '';
            document.getElementById('email').value = contactInfo.email || '';
            document.getElementById('address_1').value = contactInfo.address_1 || contactInfo.address || '';
            document.getElementById('city').value = contactInfo.city || '';
            document.getElementById('provinceCode').value = contactInfo.provinceCode || '';
            document.getElementById('postalCode').value = contactInfo.postalCode || '';
            document.getElementById('country').value = contactInfo.country || '';
            document.getElementById('notes').value = contactInfo.notes || '';
        }
    } catch (error) {
        console.error('Error loading contact info from storage:', error);
    }
}

// Save contact info to localStorage
function saveContactInfoToStorage() {
    try {
        const contactInfo = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            address_1: document.getElementById('address_1').value,
            city: document.getElementById('city').value,
            provinceCode: document.getElementById('provinceCode').value,
            postalCode: document.getElementById('postalCode').value,
            country: document.getElementById('country').value,
            notes: document.getElementById('notes').value
        };
        localStorage.setItem(STORAGE_KEYS.CONTACT_INFO, JSON.stringify(contactInfo));
    } catch (error) {
        console.error('Error saving contact info to storage:', error);
    }
}

// Clear all order data from localStorage
function clearOrderFromStorage() {
    try {
        localStorage.removeItem(STORAGE_KEYS.CART);
        localStorage.removeItem(STORAGE_KEYS.CONTACT_INFO);
    } catch (error) {
        console.error('Error clearing order from storage:', error);
    }
}

// Show error modal
function showErrorModal() {
    const errorModal = document.getElementById('error-modal');
    errorModal.style.display = 'flex';
}

// Close error modal (global function for onclick)
window.closeErrorModal = function() {
    const errorModal = document.getElementById('error-modal');
    errorModal.style.display = 'none';
    
    // Reset submit button to initial state
    const submitBtn = document.querySelector('#order-review .submit-btn');
    submitBtn.textContent = i18n.t('review.submit');
    submitBtn.disabled = false;
    
    // Force reset all styles that might be affected by disabled state
    submitBtn.style.opacity = '';
    submitBtn.style.cursor = '';
    submitBtn.style.transform = '';
    submitBtn.style.boxShadow = '';
    
    // Remove any disabled class if it exists
    submitBtn.classList.remove('disabled');
    
    console.log('Button reset:', {
        text: submitBtn.textContent,
        disabled: submitBtn.disabled,
        opacity: submitBtn.style.opacity
    });
}

// Show shipping error modal
function showShippingErrorModal() {
    const shippingErrorModal = document.getElementById('shipping-error-modal');
    shippingErrorModal.style.display = 'flex';
    
    // Disable submit button
    const submitBtn = document.querySelector('#order-review .submit-btn');
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';
    submitBtn.style.cursor = 'not-allowed';
}

// Close shipping error modal (global function for onclick)
window.closeShippingErrorModal = function() {
    const shippingErrorModal = document.getElementById('shipping-error-modal');
    shippingErrorModal.style.display = 'none';
    
    // Reset shipping calculation flag
    shippingCalculationFailed = false;
    
    // Go back to step 2 to fix address
    const contactSection = document.getElementById('contact-form');
    const reviewSection = document.getElementById('order-review');
    
    contactSection.style.display = 'block';
    reviewSection.style.display = 'none';
    
    // Scroll to contact form
    contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Pricing configuration
const PRICING = {
    basePrice: 45.00, // Base price per wheel cover
    pairDiscount: 0.05, // 5% discount for pairs
    taxRate: 0.15 // 15% Quebec taxes
};

// Track shipping calculation status
let shippingCalculationFailed = false;
let currentShipmentId = null;
let currentOrderId = null;

// Format wheel size for display
function formatWheelSize(wheelSize) {
    if (wheelSize === '26') {
        return '26"';
    }
    return wheelSize;
}

// Get spoke/rayon text based on current language
function getSpokeText() {
    const currentLang = localStorage.getItem('language') || navigator.language.split('-')[0];
    return currentLang === 'fr' ? 'rayons' : 'spokes';
}

// Get validation messages based on current language
function getValidationMessages() {
    const currentLang = localStorage.getItem('language') || navigator.language.split('-')[0];
    
    if (currentLang === 'fr') {
        return {
            nameRequired: 'Entre ton nom',
            emailRequired: 'Entre ton email',
            emailInvalid: 'Entre une adresse email valide',
            addressRequired: 'Entre ton adresse',
            cityRequired: 'Entre ta ville',
            provinceRequired: 'Entre ton code de province/état',
            postalCodeRequired: 'Entre ton code postal',
            countryRequired: 'Sélectionne ton pays'
        };
    } else {
        return {
            nameRequired: 'Please enter your name',
            emailRequired: 'Please enter your email',
            emailInvalid: 'Please enter a valid email address',
            addressRequired: 'Please enter your address',
            cityRequired: 'Please enter your city',
            provinceRequired: 'Please enter your province/state code',
            postalCodeRequired: 'Please enter your postal code',
            countryRequired: 'Please select your country'
        };
    }
}


// Calculate price for a product
function calculateProductPrice(product) {
    return PRICING.basePrice * product.quantity;
}

// Calculate cart subtotal without discount (for step 1)
function calculateCartSubtotal(products) {
    return products.reduce((sum, product) => sum + calculateProductPrice(product), 0);
}

// Calculate total price with pair discount and taxes (for step 3)
function calculateTotalPrice(products, shippingFee = 0) {
    // Calculate base subtotal (no discount)
    const baseSubtotal = products.reduce((sum, product) => sum + calculateProductPrice(product), 0);
    
    // Calculate discount only on pairs
    const totalQuantity = products.reduce((sum, product) => sum + product.quantity, 0);
    const pairsCount = Math.floor(totalQuantity / 2); // Number of complete pairs
    const itemsInPairs = pairsCount * 2; // Number of items that get discount
    
    // Calculate discounted subtotal
    const discountedAmount = itemsInPairs * PRICING.basePrice * (1 - PRICING.pairDiscount);
    const fullPriceAmount = (totalQuantity - itemsInPairs) * PRICING.basePrice;
    const subtotal = discountedAmount + fullPriceAmount;
    
    // Add Quebec taxes (15%)
    const taxes = subtotal * PRICING.taxRate;
    const total = subtotal + taxes + shippingFee;
    
    return {
        subtotal: subtotal,
        taxes: taxes,
        shippingFee: shippingFee,
        total: total,
        baseSubtotal: baseSubtotal,
        discountAmount: baseSubtotal - subtotal,
        pairsCount: pairsCount
    };
}

// Calculate shipping fee using ChitChats API
async function calculateShippingFee() {
    const addressData = {
        name: document.getElementById('name').value,
        address_1: document.getElementById('address_1').value,
        city: document.getElementById('city').value,
        province_code: document.getElementById('provinceCode').value,
        postal_code: document.getElementById('postalCode').value,
        country_code: document.getElementById('country').value
    };

    // Disable forward button while calculating shipping
    const forwardBtn = document.querySelector('#customer-form .submit-btn');
    if (forwardBtn) {
        forwardBtn.disabled = true;
        forwardBtn.style.opacity = '0.5';
        forwardBtn.style.cursor = 'not-allowed';
    }

    // Validate required fields
    if (!addressData.name || !addressData.address_1 || !addressData.city || !addressData.country_code) {
        updateShippingDisplay(0, i18n.t('contactForm.shippingValidationError'));
        shippingCalculationFailed = true;
        showShippingErrorModal();
        return;
    }

    // Calculate number of covers and total price
    const numberOfCovers = selectedProducts.reduce((total, product) => total + product.quantity, 0);
    const totalPrice = calculateTotalPrice(selectedProducts);

    try {
        // Step 1: Generate unique order ID
        const orderIdResponse = await fetch(`${API_CONFIG.baseUrl}/generate-order-id`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({})
        });

        const orderIdResult = await orderIdResponse.json();
        if (!orderIdResult.success) {
            throw new Error('Failed to generate order ID');
        }

        const orderId = orderIdResult.orderId;
        currentOrderId = orderId; // Store order ID for later use

        // Step 2: Request shipping rate with order ID
        const response = await fetch(`${API_CONFIG.baseUrl}/shipping`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                address: addressData, 
                numberOfCovers: numberOfCovers,
                totalPrice: totalPrice,
                orderId: orderId // Include order ID in shipping request
            })
        });

        const result = await response.json();

        if (result.success) {
            // Check if shipping cost is valid (not null, 0, or undefined)
            if (result.shippingCost === null || result.shippingCost === undefined || result.shippingCost === 0) {
                console.error('Shipping calculation returned invalid cost:', result.shippingCost);
                updateShippingDisplay(0, i18n.t('contactForm.shippingError'));
                shippingCalculationFailed = true;
                showShippingErrorModal();
                return;
            }
            
            updateShippingDisplay(result.shippingCost, null);
            updateTotalWithShipping(result.shippingCost);
            currentShipmentId = result.shipmentId; // Store shipment ID
            shippingCalculationFailed = false; // Reset flag on success
            
            // Re-enable forward button on success
            if (forwardBtn) {
                forwardBtn.disabled = false;
                forwardBtn.style.opacity = '1';
                forwardBtn.style.cursor = 'pointer';
            }
        } else {
            updateShippingDisplay(0, result.error || i18n.t('contactForm.shippingError'));
            shippingCalculationFailed = true;
            showShippingErrorModal();
            // Keep forward button disabled on error
        }
    } catch (error) {
        console.error('Shipping calculation error:', error);
        updateShippingDisplay(0, i18n.t('contactForm.shippingError'));
        shippingCalculationFailed = true;
        showShippingErrorModal();
        // Keep forward button disabled on error
    }
}

// Update shipping display
function updateShippingDisplay(shippingCost, error) {
    const shippingPriceElement = document.getElementById('shipping-fee-price');
    if (!shippingPriceElement) return;

    if (error) {
        shippingPriceElement.innerHTML = `<span class="shipping-error">${error}</span>`;
    } else {
        shippingPriceElement.innerHTML = `CAD$${shippingCost.toFixed(2)}`;
    }
}

// Update total price with shipping
function updateTotalWithShipping(shippingCost) {
    const pricing = calculateTotalPrice(selectedProducts, shippingCost);
    reviewTotalPrice.textContent = pricing.total.toFixed(2);
}

// Update cart display
function updateCartDisplay() {
    if (selectedProducts.length === 0) {
        cartSummary.style.display = 'none';
        return;
    }
    
    cartSummary.style.display = 'block';
    
    cartItems.innerHTML = '';
    selectedProducts.forEach((product, index) => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        
        // Add discount badge only if this specific item has quantity > 1
        const discountBadge = product.quantity > 1 ? '<span class="discount-badge">5% OFF</span>' : '';
        
        cartItem.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-quantity">${product.quantity}x</div>
                <div class="cart-item-details">${product.spokeCount} ${getSpokeText()}, ${formatWheelSize(product.wheelSize)}</div>
            </div>
            <div class="cart-item-price">CAD$${calculateProductPrice(product).toFixed(2)}</div>
            <button type="button" class="remove-item-btn" onclick="removeFromCart(${index})">×</button>
            ${discountBadge}
        `;
        cartItems.appendChild(cartItem);
    });
    
    const cartSubtotal = calculateCartSubtotal(selectedProducts);
    totalPriceSpan.textContent = cartSubtotal.toFixed(2);
}

// Add product to cart
function addToCart() {
    if (!currentProduct.spokeCount || !currentProduct.wheelSize) {
        alert(i18n.t('cart.selectBothOptions'));
        return;
    }
    
    // Check if this exact combination already exists
    const existingIndex = selectedProducts.findIndex(p => 
        p.spokeCount === currentProduct.spokeCount && 
        p.wheelSize === currentProduct.wheelSize
    );
    
    if (existingIndex !== -1) {
        // Update quantity of existing item
        selectedProducts[existingIndex].quantity += currentProduct.quantity;
    } else {
        // Add new item
        selectedProducts.push({
            spokeCount: currentProduct.spokeCount,
            wheelSize: currentProduct.wheelSize,
            quantity: currentProduct.quantity
        });
    }
    
    // Reset current product
    currentProduct = {
        spokeCount: '',
        wheelSize: '',
        quantity: 1
    };
    
    // Clear current product from localStorage
    localStorage.removeItem(STORAGE_KEYS.CURRENT_PRODUCT);
    
    // Reset form
    resetProductForm();
    updateCartDisplay();
    
    // Save cart to localStorage
    saveCartToStorage();
    
    // Scroll to cart title to show the updated order
    const cartTitle = cartSummary.querySelector('h3');
    cartTitle.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Remove item from cart (global function for onclick)
window.removeFromCart = function(index) {
    selectedProducts.splice(index, 1);
    updateCartDisplay();
    saveCartToStorage();
};

// Reset product form
function resetProductForm() {
    // Clear selections
    document.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
    spokeCountInput.value = '';
    wheelSizeInput.value = '';
    quantityInput.value = 1;
    currentProduct.quantity = 1;
    
    // Disable add to cart button
    addToCartBtn.disabled = true;
}

// Three.js setup for main scene
let scene, camera, renderer, controls, model;

function initThreeJS() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = null;

    // Create camera
    const container = document.getElementById('model-container');
    camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(0, 0, 8);  // Adjusted for larger model view
    camera.lookAt(0, 0, 0);

    // Create renderer with transparency
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true
    });
    renderer.setSize(container.clientWidth, container.clientWidth);
    container.appendChild(renderer.domElement);

    // Function to handle speed boost
    function boostSpeed() {
        // Increase speed multiplier with each click (up to max) - MUCH more dramatic!
        speedMultiplier += 2.0; // Increased from 0.5 to 2.0
        if (speedMultiplier > maxSpeedMultiplier) {
            speedMultiplier = maxSpeedMultiplier;
        }
    }

    // Add click event listener for speed boost (desktop)
    renderer.domElement.addEventListener('click', boostSpeed);
    
    // Add touch event listener for speed boost (mobile/touch screens)
    renderer.domElement.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent default touch behavior
        boostSpeed();
    });

    // No lights - flat cell-shading effect

    // Add controls with restricted movement
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.enableZoom = false;  // Disable zoom
    controls.enableDolly = false; // Disable dolly (zoom with mouse wheel)
    controls.enablePan = false;   // Disable pan
    controls.minPolarAngle = Math.PI / 4;
    controls.maxPolarAngle = Math.PI * 3/4;
    
    // Configure touch controls for mobile - only rotation
    controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.ROTATE  // Changed from DOLLY_PAN to ROTATE
    };

    // Load model
    const loader = new THREE.GLTFLoader();
    loader.load('/assets/models/Wheelcover_Outline.glb', function(gltf) {
        model = gltf.scene;
        model.rotation.x = -Math.PI / 2;
        model.scale.set(0.27, 0.27, 0.27);  // Further reduced scale for better size
        
        // Create materials for true cell-shading effect (no lighting)
        const cellShadingMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000  // Pure black, no lighting effects
        });
        
        const yellowCoverMaterial = new THREE.MeshBasicMaterial({
            color: 0xefca52  // Pure yellow, no lighting effects
        });
        
        // Apply materials based on original color brightness
        model.traverse((child) => {
            if (child.isMesh) {
                // Check the original material color to determine if it should be black (cell-shading) or yellow (cover)
                const originalColor = child.material.color;
                const brightness = originalColor.r + originalColor.g + originalColor.b;
                
                // If the original color is very dark (black), make it black (cell-shading)
                // Otherwise, make it yellow (cover matching background)
                child.material = brightness < 0.1 ? cellShadingMaterial : yellowCoverMaterial;
            }
        });
        
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        
        scene.add(model);
        animate();
    }, undefined, function(error) {
        console.error('Error loading model:', error);
    });

    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    const container = document.getElementById('model-container');
    const size = container.clientWidth;
    camera.aspect = 1;
    camera.updateProjectionMatrix();
    renderer.setSize(size, size);
}

// Model rotation variables
let baseRotationSpeed = 0.005;
let speedMultiplier = 1; // Stackable speed multiplier
let maxSpeedMultiplier = 25; // Maximum speed multiplier (much higher!)

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    
    if (model) {
        // Apply rotation speed with multiplier
        model.rotation.y += baseRotationSpeed * speedMultiplier;
        
        // Gradually reduce speed multiplier over time when not clicking
        if (speedMultiplier > 1) {
            speedMultiplier -= 0.05; // Much faster decay for quicker slowdown
            if (speedMultiplier < 1) {
                speedMultiplier = 1;
            }
        }
    }
    
    renderer.render(scene, camera);
}

// Initialize main scene
initThreeJS();

// Promo scene with two wheel covers
function initPromoScene() {
    const container = document.getElementById('promo-model-container');
    if (!container) return;

    const promoScene = new THREE.Scene();
    promoScene.background = null;

    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    promoScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 2);
    promoScene.add(directionalLight);

    // Party colors array
    const partyColors = [
        0xff0000, // Red
        0x00ff00, // Green
        0x0000ff, // Blue
        0xff00ff, // Magenta
        0xffff00, // Yellow
        0x00ffff, // Cyan
        0xff8800, // Orange
        0xff0088, // Pink
        0x8800ff, // Purple
        0x00ff88  // Turquoise
    ].map(color => new THREE.Color(color));

    const loader = new THREE.GLTFLoader();
    let model1, model2;
    let material1, material2;

    loader.load('/assets/models/Wheelcover_Outline.glb', function(gltf) {
        model1 = gltf.scene.clone();
        model1.scale.set(0.3, 0.3, 0.3);
        model1.position.set(-4, 0, 0);
        model1.rotation.x = -Math.PI / 2;
        
        // Create materials for first model
        const blackMaterial1 = new THREE.MeshPhongMaterial({
            color: 0x000000,
            shininess: 100
        });
        
        material1 = new THREE.MeshPhongMaterial({
            color: partyColors[0],
            shininess: 100,
            transparent: true,
            opacity: 0.8
        });
        
        model1.traverse((child) => {
            if (child.isMesh) {
                // Check the original material color to determine if it should be black or colored
                const originalColor = child.material.color;
                const brightness = originalColor.r + originalColor.g + originalColor.b;
                
                // If the original color is very dark (black), keep it black
                child.material = brightness < 0.1 ? blackMaterial1 : material1;
            }
        });
        promoScene.add(model1);

        model2 = gltf.scene.clone();
        model2.scale.set(0.3, 0.3, 0.3);
        model2.position.set(4, 0, 0);
        model2.rotation.x = -Math.PI / 2;
        
        // Create materials for second model
        const blackMaterial2 = new THREE.MeshPhongMaterial({
            color: 0x000000,
            shininess: 100
        });
        
        material2 = new THREE.MeshPhongMaterial({
            color: partyColors[1],
            shininess: 100,
            transparent: true,
            opacity: 0.8
        });
        
        model2.traverse((child) => {
            if (child.isMesh) {
                // Check the original material color to determine if it should be black or colored
                const originalColor = child.material.color;
                const brightness = originalColor.r + originalColor.g + originalColor.b;
                
                // If the original color is very dark (black), keep it black
                child.material = brightness < 0.1 ? blackMaterial2 : material2;
            }
        });
        promoScene.add(model2);

        animatePromo();
    });

    const rotationSpeeds = {
        model1: {
            x: (Math.random() - 0.5) * 0.04,
            y: (Math.random() - 0.5) * 0.04,
            z: (Math.random() - 0.5) * 0.04
        },
        model2: {
            x: (Math.random() - 0.5) * 0.04,
            y: (Math.random() - 0.5) * 0.04,
            z: (Math.random() - 0.5) * 0.04
        }
    };

    let colorIndex1 = 0;
    let colorIndex2 = 1;
    let lastColorChange = 0;
    const colorChangeInterval = 2000;
    let transitionProgress = 0;
    
    // Store current and target colors
    let currentColor1 = partyColors[0].clone();
    let currentColor2 = partyColors[1].clone();
    let targetColor1 = partyColors[0].clone();
    let targetColor2 = partyColors[1].clone();

    function animatePromo() {
        requestAnimationFrame(animatePromo);

        if (model1 && model2 && material1 && material2) {
            // Rotate models
            model1.rotation.x += rotationSpeeds.model1.x;
            model1.rotation.y += rotationSpeeds.model1.y;
            model1.rotation.z += rotationSpeeds.model1.z;

            model2.rotation.x += rotationSpeeds.model2.x;
            model2.rotation.y += rotationSpeeds.model2.y;
            model2.rotation.z += rotationSpeeds.model2.z;

            // Update colors with smooth transition
            const currentTime = Date.now();
            
            if (currentTime - lastColorChange > colorChangeInterval) {
                // Set new target colors
                colorIndex1 = (colorIndex1 + Math.floor(Math.random() * 3) + 1) % partyColors.length;
                colorIndex2 = (colorIndex2 + Math.floor(Math.random() * 3) + 1) % partyColors.length;
                
                currentColor1.copy(material1.color);
                currentColor2.copy(material2.color);
                targetColor1.copy(partyColors[colorIndex1]);
                targetColor2.copy(partyColors[colorIndex2]);
                
                transitionProgress = 0;
                lastColorChange = currentTime;
            }

            // Smooth color transition
            if (transitionProgress < 1) {
                transitionProgress += 0.02;
                
                const lerpColor1 = new THREE.Color();
                const lerpColor2 = new THREE.Color();
                
                lerpColor1.lerpColors(currentColor1, targetColor1, transitionProgress);
                lerpColor2.lerpColors(currentColor2, targetColor2, transitionProgress);

                material1.color.copy(lerpColor1);
                material2.color.copy(lerpColor2);
            }
        }

        renderer.render(promoScene, camera);
    }

    function onPromoResize() {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }

    window.addEventListener('resize', onPromoResize, false);
}

// Initialize promo scene separately
document.addEventListener('DOMContentLoaded', () => {
    initPromoScene();
});

// Handle option button clicks
function handleOptionClick(group, input, value) {
    // Remove selected class from all buttons in the group
    group.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Add selected class to clicked button
    event.target.classList.add('selected');
    
    // Update hidden input value
    input.value = value;
    
    // Update selected product
    if (group === spokeCountGroup) {
        currentProduct.spokeCount = value;
    } else {
        currentProduct.wheelSize = value;
    }
    
    // Save current product state
    saveCurrentProductToStorage();
    
    // Enable add to cart button if both options are selected
    addToCartBtn.disabled = !(currentProduct.spokeCount && currentProduct.wheelSize);
}

// Add click handlers to spoke count buttons
spokeCountGroup.querySelectorAll('.option-btn').forEach(button => {
    button.addEventListener('click', (event) => {
        handleOptionClick(spokeCountGroup, spokeCountInput, event.target.dataset.value);
    });
});

// Add click handlers to wheel size buttons
wheelSizeGroup.querySelectorAll('.option-btn').forEach(button => {
    button.addEventListener('click', (event) => {
        handleOptionClick(wheelSizeGroup, wheelSizeInput, event.target.dataset.value);
    });
});

// Quantity controls
quantityMinusBtn.addEventListener('click', () => {
    if (currentProduct.quantity > 1) {
        currentProduct.quantity--;
        quantityInput.value = currentProduct.quantity;
        saveCurrentProductToStorage();
    }
});

quantityPlusBtn.addEventListener('click', () => {
    if (currentProduct.quantity < 10) {
        currentProduct.quantity++;
        quantityInput.value = currentProduct.quantity;
        saveCurrentProductToStorage();
    }
});

// Add to cart button
addToCartBtn.addEventListener('click', addToCart);

// Continue button removed - functionality moved to cart total button

// Cart total button click to continue
document.getElementById('cart-total-btn').addEventListener('click', () => {
    if (selectedProducts.length === 0) {
        alert(i18n.t('cart.addAtLeastOneItem'));
        return;
    }
    
    productSection.style.display = 'none';
    contactSection.style.display = 'block';
    
    // Wake up server for faster response on step 3
    wakeUpServer();
    
    // Initialize forward button as disabled until shipping is calculated
    const forwardBtn = document.querySelector('#customer-form .submit-btn');
    if (forwardBtn) {
        forwardBtn.disabled = true;
        forwardBtn.style.opacity = '0.5';
        forwardBtn.style.cursor = 'not-allowed';
    }
    
    // Scroll to title of contact section with some space above
    const contactTitle = contactSection.querySelector('.section-header');
    contactTitle.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// Generate random order code
function generateOrderCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const codeLength = 8;
    let code = '';
    for (let i = 0; i < codeLength; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}

// API Functions
async function createOrderInAPI(orderData) {
    try {
        // Send order data to Netlify function
        const response = await fetch(`${API_CONFIG.baseUrl}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Request failed: ${response.status}`);
        }

        const result = await response.json();
        return {
            success: true,
            orderId: result.order.id,
            orderCode: result.order.orderCode,
            totalPrice: result.order.totalPrice,
            taxAmount: result.order.taxAmount
        };

    } catch (error) {
        console.error('API Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Form validation functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateName(name) {
    return name.trim().length > 0;
}

function validateAddress(address) {
    return address.trim().length > 0;
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const formGroup = field.closest('.form-group');
    
    // Remove existing error
    const existingError = formGroup.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    
    // Add error class to field
    field.classList.add('error');
    
    // Create error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    formGroup.appendChild(errorDiv);
}

function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const formGroup = field.closest('.form-group');
    
    // Remove error class
    field.classList.remove('error');
    
    // Remove error message
    const existingError = formGroup.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
}

function validateForm() {
    let isValid = true;
    const messages = getValidationMessages();
    
    // Validate name
    const name = document.getElementById('name').value;
    if (!validateName(name)) {
        showFieldError('name', messages.nameRequired);
        isValid = false;
    } else {
        clearFieldError('name');
    }
    
    // Validate email
    const email = document.getElementById('email').value;
    if (!email.trim()) {
        showFieldError('email', messages.emailRequired);
        isValid = false;
    } else if (!validateEmail(email)) {
        showFieldError('email', messages.emailInvalid);
        isValid = false;
    } else {
        clearFieldError('email');
    }
    
    // Validate address fields
    const address_1 = document.getElementById('address_1').value;
    const city = document.getElementById('city').value;
    const country = document.getElementById('country').value;
    
    if (!address_1.trim()) {
        showFieldError('address_1', messages.addressRequired);
        isValid = false;
    } else {
        clearFieldError('address_1');
    }
    
    if (!city.trim()) {
        showFieldError('city', messages.cityRequired);
        isValid = false;
    } else {
        clearFieldError('city');
    }
    
    // Validate province code
    const provinceCode = document.getElementById('provinceCode').value;
    if (!provinceCode.trim()) {
        showFieldError('provinceCode', messages.provinceRequired);
        isValid = false;
    } else {
        clearFieldError('provinceCode');
    }
    
    // Validate postal code
    const postalCode = document.getElementById('postalCode').value;
    if (!postalCode.trim()) {
        showFieldError('postalCode', messages.postalCodeRequired);
        isValid = false;
    } else {
        clearFieldError('postalCode');
    }
    
    if (!country.trim()) {
        showFieldError('country', messages.countryRequired);
        isValid = false;
    } else {
        clearFieldError('country');
    }
    
    return isValid;
}

// Handle customer form submission
customerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
        return;
    }
    
    // Show review section
    contactSection.style.display = 'none';
    reviewSection.style.display = 'block';
    updateReviewDisplay();
    
    // Scroll to title of review section with some space above
    const reviewTitle = reviewSection.querySelector('.section-header');
    reviewTitle.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// Validation errors will only show when form is submitted

// Image Carousel functionality
let currentImageIndex = 0;
let carouselImages = [];

// Initialize carousel
function initImageCarousel() {
    carouselImages = Array.from(document.querySelectorAll('.gallery-image')).map(img => ({
        src: img.src,
        alt: img.alt
    }));
    
    // Add click listeners to gallery images
    document.querySelectorAll('.gallery-image').forEach((img, index) => {
        img.addEventListener('click', () => openImageCarousel(index));
    });
}

// Open carousel with specific image
function openImageCarousel(index) {
    currentImageIndex = index;
    const carousel = document.getElementById('image-carousel');
    const carouselImage = document.getElementById('carousel-image');
    
    carouselImage.src = carouselImages[currentImageIndex].src;
    carouselImage.alt = carouselImages[currentImageIndex].alt;
    
    carousel.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Close carousel
window.closeImageCarousel = function() {
    const carousel = document.getElementById('image-carousel');
    carousel.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Navigate to previous image
window.previousImage = function() {
    currentImageIndex = (currentImageIndex - 1 + carouselImages.length) % carouselImages.length;
    updateCarouselImage();
}

// Navigate to next image
window.nextImage = function() {
    currentImageIndex = (currentImageIndex + 1) % carouselImages.length;
    updateCarouselImage();
}

// Update carousel image
function updateCarouselImage() {
    const carouselImage = document.getElementById('carousel-image');
    carouselImage.src = carouselImages[currentImageIndex].src;
    carouselImage.alt = carouselImages[currentImageIndex].alt;
}

// Touch/swipe support for mobile
let touchStartX = 0;
let touchEndX = 0;

function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
}

function handleTouchEnd(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // Swipe left - next image
            nextImage();
        } else {
            // Swipe right - previous image
            previousImage();
        }
    }
}

// Add touch event listeners
document.addEventListener('DOMContentLoaded', () => {
    initImageCarousel();
    
    const carousel = document.getElementById('image-carousel');
    carousel.addEventListener('touchstart', handleTouchStart, { passive: true });
    carousel.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (document.getElementById('image-carousel').style.display === 'flex') {
            if (e.key === 'ArrowLeft') {
                previousImage();
            } else if (e.key === 'ArrowRight') {
                nextImage();
            } else if (e.key === 'Escape') {
                closeImageCarousel();
            }
        }
    });
});

// Update review display
function updateReviewDisplay() {
    // Contact info
    const address_1 = document.getElementById('address_1').value;
    const city = document.getElementById('city').value;
    const provinceCode = document.getElementById('provinceCode').value;
    const postalCode = document.getElementById('postalCode').value;
    const country = document.getElementById('country').value;
    
    // Format address for display
    let addressDisplay = address_1 + ', ' + city;
    if (provinceCode) {
        addressDisplay += ', ' + provinceCode;
    }
    if (postalCode) {
        addressDisplay += ', ' + postalCode;
    }
    addressDisplay += ', ' + country;
    
    reviewContactInfo.innerHTML = `
        <div class="review-contact-item">
            <span class="review-contact-label">Name:</span> ${document.getElementById('name').value}
        </div>
        <div class="review-contact-item">
            <span class="review-contact-label">Email:</span> ${document.getElementById('email').value}
        </div>
        <div class="review-contact-item">
            <span class="review-contact-label">Address:</span> ${addressDisplay}
        </div>
        ${document.getElementById('notes').value ? `
        <div class="review-contact-item">
            <span class="review-contact-label">Notes:</span> ${document.getElementById('notes').value}
        </div>
        ` : ''}
    `;
    
    // Order items
    reviewOrderItems.innerHTML = '';
    selectedProducts.forEach(product => {
        const orderItem = document.createElement('div');
        orderItem.className = 'review-order-item';
        orderItem.innerHTML = `
            <div>
                <strong>${product.quantity}x</strong> ${product.spokeCount} ${getSpokeText()}, ${formatWheelSize(product.wheelSize)}
            </div>
            <div>CAD$${calculateProductPrice(product).toFixed(2)}</div>
        `;
        reviewOrderItems.appendChild(orderItem);
    });
    
    // Show pricing breakdown
    const pricing = calculateTotalPrice(selectedProducts);
    
    // Show pair discount if applicable
    if (pricing.pairsCount > 0) {
        const discountItem = document.createElement('div');
        discountItem.className = 'review-order-item';
        discountItem.innerHTML = `
            <div><em>5% Pair Discount (${pricing.pairsCount} pair${pricing.pairsCount > 1 ? 's' : ''})</em></div>
            <div>-CAD$${pricing.discountAmount.toFixed(2)}</div>
        `;
        reviewOrderItems.appendChild(discountItem);
    }
    
    // Subtotal
    const subtotalItem = document.createElement('div');
    subtotalItem.className = 'review-order-item';
    subtotalItem.innerHTML = `
        <div><strong>Subtotal</strong></div>
        <div>CAD$${pricing.subtotal.toFixed(2)}</div>
    `;
    reviewOrderItems.appendChild(subtotalItem);
    
    // Taxes
    const taxItem = document.createElement('div');
    taxItem.className = 'review-order-item';
    taxItem.innerHTML = `
        <div><strong>Taxes (15%)</strong></div>
        <div>CAD$${pricing.taxes.toFixed(2)}</div>
    `;
    reviewOrderItems.appendChild(taxItem);
    
    // Shipping Fee
    const shippingItem = document.createElement('div');
    shippingItem.className = 'review-order-item';
    shippingItem.id = 'shipping-fee-item';
    shippingItem.innerHTML = `
        <div><strong>Shipping</strong></div>
        <div id="shipping-fee-price" class="shipping-loader">
            <span class="loader"></span>
        </div>
    `;
    reviewOrderItems.appendChild(shippingItem);
    
    // Calculate shipping fee
    calculateShippingFee();
    
    // Total (will be updated after shipping calculation)
    reviewTotalPrice.textContent = pricing.total.toFixed(2);
}

// Handle final order submission
document.querySelector('#order-review .submit-btn').addEventListener('click', async () => {
    // Check if shipping calculation failed
    if (shippingCalculationFailed) {
        showShippingErrorModal();
        return;
    }

    // Get current shipping fee
    const shippingFeeElement = document.getElementById('shipping-fee-price');
    let shippingFee = 0;
    if (shippingFeeElement && !shippingFeeElement.querySelector('.loader')) {
        const shippingText = shippingFeeElement.textContent;
        const match = shippingText.match(/CAD\$(\d+\.?\d*)/);
        if (match) {
            shippingFee = parseFloat(match[1]);
        }
    }

    const formData = {
        products: selectedProducts,
        customerName: document.getElementById('name').value,
        customerEmail: document.getElementById('email').value,
        shippingAddress: {
            name: document.getElementById('name').value,
            address_1: document.getElementById('address_1').value,
            city: document.getElementById('city').value,
            province_code: document.getElementById('provinceCode').value,
            postal_code: document.getElementById('postalCode').value,
            country_code: document.getElementById('country').value
        },
        notes: document.getElementById('notes').value,
        language: localStorage.getItem('language') || navigator.language.split('-')[0],
        shippingFee: shippingFee,
        shipmentId: currentShipmentId,
        orderId: currentOrderId
    };

    try {
        // Show loading state
        const submitBtn = document.querySelector('#order-review .submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = i18n.t('review.submitting');
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';

        // Create order via API
        const result = await createOrderInAPI(formData);

        if (result.success) {
            // Clear order data from localStorage after successful submission
            clearOrderFromStorage();
            
            // Show confirmation
            reviewSection.style.display = 'none';
            confirmationSection.style.display = 'block';
            orderCodeSpan.textContent = result.orderCode;
            
            // Scroll to title of confirmation section with some space above
            const confirmationTitle = confirmationSection.querySelector('.section-header');
            confirmationTitle.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('Error submitting order:', error);
        
        // Show custom error modal
        showErrorModal();
        
        // Update button text to "Try again?"
        const submitBtn = document.querySelector('#order-review .submit-btn');
        submitBtn.textContent = i18n.t('errorModal.tryAgain');
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
    }
});

// Handle back button clicks
document.querySelector('#contact-form .back-btn').addEventListener('click', () => {
    contactSection.style.display = 'none';
    productSection.style.display = 'block';
    
    // Scroll to title of product section with some space above
    const productTitle = productSection.querySelector('.section-header');
    productTitle.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

document.querySelector('#order-review .back-btn').addEventListener('click', () => {
    reviewSection.style.display = 'none';
    contactSection.style.display = 'block';
    
    // Initialize forward button as disabled until shipping is calculated
    const forwardBtn = document.querySelector('#customer-form .submit-btn');
    if (forwardBtn) {
        forwardBtn.disabled = true;
        forwardBtn.style.opacity = '0.5';
        forwardBtn.style.cursor = 'not-allowed';
    }
    
    // Scroll to title of contact section with some space above
    const contactTitle = contactSection.querySelector('.section-header');
    contactTitle.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// Save contact info to localStorage as user types
document.getElementById('name').addEventListener('input', function() {
    saveContactInfoToStorage();
    checkSpecialNames(this.value);
});
document.getElementById('email').addEventListener('input', saveContactInfoToStorage);
document.getElementById('address_1').addEventListener('input', saveContactInfoToStorage);
document.getElementById('city').addEventListener('input', saveContactInfoToStorage);
document.getElementById('provinceCode').addEventListener('input', saveContactInfoToStorage);
document.getElementById('postalCode').addEventListener('input', saveContactInfoToStorage);
document.getElementById('country').addEventListener('input', saveContactInfoToStorage);
document.getElementById('country').addEventListener('change', function() {
    const otherMessage = document.getElementById('other-country-message');
    const submitBtn = document.querySelector('#customer-form .submit-btn');
    
    if (this.value === 'OTHER') {
        otherMessage.style.display = 'block';
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
    } else {
        otherMessage.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
    }
});
document.getElementById('notes').addEventListener('input', saveContactInfoToStorage);

// Function to check and disable submit button if "Other" is selected
function checkCountrySelection() {
    const countrySelect = document.getElementById('country');
    const otherMessage = document.getElementById('other-country-message');
    const submitBtn = document.querySelector('#customer-form .submit-btn');
    
    if (countrySelect.value === 'OTHER') {
        otherMessage.style.display = 'block';
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
    } else {
        otherMessage.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
    }
}

// Function to check for special names (Easter egg for English only)
function checkSpecialNames(name) {
    const currentLang = localStorage.getItem('language') || navigator.language.split('-')[0];
    
    // Only show Easter egg in English
    if (currentLang !== 'en') {
        hideSpecialNameMessage();
        return;
    }
    
    const trimmedName = name.trim().toLowerCase();
    
    if (trimmedName === 'tony' || trimmedName === 'ezekiel') {
        showSpecialNameMessage(trimmedName);
    } else {
        hideSpecialNameMessage();
    }
}

// Function to show special name message
function showSpecialNameMessage(name) {
    // Remove existing message if any
    hideSpecialNameMessage();
    
    const nameField = document.getElementById('name');
    const formGroup = nameField.closest('.form-group');
    
    // Create the special message element
    const specialMessage = document.createElement('div');
    specialMessage.id = 'special-name-message';
    specialMessage.className = 'special-name-message';
    specialMessage.innerHTML = `
        <span>Fuck you ${name.charAt(0).toUpperCase() + name.slice(1)}!</span>
        <span class="arrow">→</span>
    `;
    
    // Add click event to open YouTube link
    specialMessage.addEventListener('click', function() {
        window.open('https://www.youtube.com/watch?v=jqFdeC7_0_w', '_blank');
    });
    
    // Insert inside the form group, after the input field
    formGroup.appendChild(specialMessage);
}

// Function to hide special name message
function hideSpecialNameMessage() {
    const existingMessage = document.getElementById('special-name-message');
    if (existingMessage) {
        existingMessage.remove();
    }
}

// DEBUG: Function to show step 4 without API call
window.showConfirmationDebug = function() {
    // Generate a mock order code
    const mockOrderCode = generateOrderCode();
    
    // Show confirmation section
    reviewSection.style.display = 'none';
    confirmationSection.style.display = 'block';
    orderCodeSpan.textContent = mockOrderCode;
    
    // Scroll to title of confirmation section
    const confirmationTitle = confirmationSection.querySelector('.section-header');
    confirmationTitle.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    console.log('DEBUG: Showing confirmation page with mock order code:', mockOrderCode);
};

// Initialize: Load saved data from localStorage when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadCartFromStorage();
    loadContactInfoFromStorage();
    
    // Check if "Other" country is selected and disable button if needed
    setTimeout(checkCountrySelection, 100);
    
    // Listen for language changes to update cart display and review
    window.addEventListener('languageChanged', () => {
        updateCartDisplay();
        // Update review display if it's currently visible
        if (reviewSection.style.display === 'block') {
            updateReviewDisplay();
        }
    });
});

// Order Status Modal Functions
function showOrderStatusModal() {
    const modal = document.getElementById('order-status-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    } else {
        console.error('Order status modal element not found');
    }
}

// Make function globally accessible
window.closeOrderStatusModal = function() {
    const modal = document.getElementById('order-status-modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Remove order parameter from URL
    const url = new URL(window.location);
    url.searchParams.delete('order');
    window.history.replaceState({}, '', url);
};

async function loadOrderDetails(orderId) {
    const loadingDiv = document.getElementById('order-loading');
    const contentDiv = document.getElementById('order-content');
    const errorDiv = document.getElementById('order-error');
    
    // Show loading state
    loadingDiv.style.display = 'block';
    contentDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}/get-order/${orderId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        
        if (result.success && result.order) {
            displayOrderDetails(result.order);
        } else {
            showOrderError();
        }
    } catch (error) {
        console.error('Error loading order details:', error);
        showOrderError();
    }
}

function displayOrderDetails(order) {
    const loadingDiv = document.getElementById('order-loading');
    const contentDiv = document.getElementById('order-content');
    const errorDiv = document.getElementById('order-error');
    
    // Hide loading and error, show content
    loadingDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    contentDiv.style.display = 'block';
    
    // Populate order details
    document.getElementById('order-code').textContent = order.orderCode;
    
    // Status with description
    const status = order.orderStatus || 'pending';
    const statusElement = document.getElementById('order-status');
    const statusDescriptionElement = document.getElementById('order-status-description');
    
    // Get translated status and description
    const statusKey = `orderStatus.status.${status}`;
    const descriptionKey = `orderStatus.statusDescription.${status}`;
    
    statusElement.textContent = i18n.t(statusKey) || status;
    statusDescriptionElement.textContent = i18n.t(descriptionKey) || '';
    
    // Contact info (exactly like step 3)
    const orderContactInfo = document.getElementById('order-contact-info');
    orderContactInfo.innerHTML = `
        <div class="review-contact-item">
            <span class="review-contact-label">${i18n.t('orderStatus.customerName')}</span> ${order.customerName}
        </div>
        <div class="review-contact-item">
            <span class="review-contact-label">${i18n.t('orderStatus.customerEmail')}</span> ${order.customerEmail}
        </div>
        <div class="review-contact-item">
            <span class="review-contact-label">${i18n.t('orderStatus.shippingAddress')}</span> ${order.shippingAddress}
        </div>
        ${order.notes && order.notes.trim() ? `
        <div class="review-contact-item">
            <span class="review-contact-label">${i18n.t('orderStatus.notes')}</span> ${order.notes}
        </div>
        ` : ''}
    `;
    
    // Order items (exactly like step 3)
    const itemsDiv = document.getElementById('order-items');
    itemsDiv.innerHTML = '';
    
    if (order.products && Array.isArray(order.products) && order.products.length > 0) {
        // Add product items
        order.products.forEach(product => {
            const orderItem = document.createElement('div');
            orderItem.className = 'review-order-item';
            orderItem.innerHTML = `
                <div>
                    <strong>${product.quantity}x</strong> ${product.spokeCount} ${getSpokeText()}, ${formatWheelSize(product.wheelSize)}
                </div>
                <div>CAD$${(product.price || 0).toFixed(2)}</div>
            `;
            itemsDiv.appendChild(orderItem);
        });
    } else {
        // Fallback: show order summary from Airtable if products are empty
        const productSummary = order.productSummary || 'Order details not available';
        const orderItem = document.createElement('div');
        orderItem.className = 'review-order-item';
        // Convert \n to <br> tags for proper line breaks
        const formattedSummary = productSummary.replace(/\n/g, '<br>');
        orderItem.innerHTML = `<div class="product-summary">${formattedSummary}</div><div></div>`;
        itemsDiv.appendChild(orderItem);
    }
    
    // Add subtotal (exactly like step 3)
    const subtotalItem = document.createElement('div');
    subtotalItem.className = 'review-order-item';
    subtotalItem.innerHTML = `
        <div><strong>${i18n.t('orderStatus.subtotal')}</strong></div>
        <div>CAD$${(order.subtotal || 0).toFixed(2)}</div>
    `;
    itemsDiv.appendChild(subtotalItem);
    
    // Add taxes (exactly like step 3)
    const taxesItem = document.createElement('div');
    taxesItem.className = 'review-order-item';
    taxesItem.innerHTML = `
        <div><strong>${i18n.t('orderStatus.taxes')}</strong></div>
        <div>CAD$${(order.taxes || 0).toFixed(2)}</div>
    `;
    itemsDiv.appendChild(taxesItem);
    
    // Add shipping (exactly like step 3)
    const shippingItem = document.createElement('div');
    shippingItem.className = 'review-order-item';
    shippingItem.innerHTML = `
        <div><strong>${i18n.t('orderStatus.shipping')}</strong></div>
        <div>CAD$${(order.shippingFee || 0).toFixed(2)}</div>
    `;
    itemsDiv.appendChild(shippingItem);
    
    // Display total (exactly like step 3)
    document.getElementById('order-total').textContent = (order.totalPrice || 0).toFixed(2);
    
}

function showOrderError() {
    const loadingDiv = document.getElementById('order-loading');
    const contentDiv = document.getElementById('order-content');
    const errorDiv = document.getElementById('order-error');
    
    loadingDiv.style.display = 'none';
    contentDiv.style.display = 'none';
    errorDiv.style.display = 'block';
}

// Check for order parameter on page load
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order');
    
    if (orderId) {
        // Add a small delay to ensure all other DOMContentLoaded handlers have run
        setTimeout(() => {
            showOrderStatusModal();
            loadOrderDetails(orderId);
        }, 100);
    }
}); 