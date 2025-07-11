
class CarPart {
    constructor(id, productId, name) {
        this.id = id;
        this.productId = productId;
        this.name = name;
        this.isSelected = false;
    }

    select() {
        this.isSelected = true;
    }

    deselect() {
        this.isSelected = false;
    }
}

class CartManager {
    constructor() {
        this.items = [];
    }

    addItem(partId) {
        if (!this.items.includes(partId)) {
            this.items.push(partId);
        }
        return this.items.length;
    }

    removeItem(partId) {
        const index = this.items.indexOf(partId);
        if (index > -1) {
            this.items.splice(index, 1);
        }
        return this.items.length;
    }

    hasItem(partId) {
        return this.items.includes(partId);
    }

    getAllItems() {
        return [...this.items];
    }

    getCount() {
        return this.items.length;
    }

    clear() {
        this.items = [];
    }
}

class UIManager {
    constructor() {
        this.elements = {
            addedProductsList: document.getElementById('added-products'),
            partsCounter: document.getElementById('parts-count'),
            carDiagram: document.getElementById('car-diagram'),
            successMessage: document.getElementById('success-message')
        };
    }

    updatePartsList(selectedParts, partNames, onRemoveCallback) {
        this.elements.addedProductsList.innerHTML = '';

        selectedParts.forEach((partId, index) => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
        <span>${partNames[partId]}</span>
        <button class="remove-btn" 
                data-part-id="${partId}"
                aria-label="Remove ${partNames[partId]} from cart"
                title="Remove ${partNames[partId]}">×</button>
      `;

            const removeButton = listItem.querySelector('.remove-btn');
            removeButton.addEventListener('click', () => onRemoveCallback(partId));

            removeButton.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onRemoveCallback(partId);
                }
            });

            this.elements.addedProductsList.appendChild(listItem);
        });

        this.elements.partsCounter.textContent = selectedParts.length;

        this.announceCartChange(selectedParts.length, partNames);
    }

    announceCartChange(count, partNames) {
        const announcement = count === 0
            ? "Cart is empty"
            : `Cart updated. ${count} part${count === 1 ? '' : 's'} selected.`;

        this.announceToScreenReader(announcement);
    }

    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;

        document.body.appendChild(announcement);

        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    showSuccessState() {
        this.elements.carDiagram.style.display = 'none';
        this.elements.successMessage.style.display = 'flex';

        this.elements.successMessage.focus();
        this.announceToScreenReader("Поздравляю! Вы выбрали все части автомобиля, тем самым собрали автомобиль 🎉");
    }

    showConfigurationState() {
        this.elements.carDiagram.style.display = 'block';
        this.elements.successMessage.style.display = 'none';
    }

    updatePartVisualState(partId, isSelected) {
        const element = document.getElementById(partId);
        if (element) {
            if (isSelected) {
                element.classList.add('clicked');
                element.setAttribute('aria-pressed', 'true');
                element.setAttribute('aria-label', `${element.getAttribute('aria-label').replace('Click to add', 'Selected - Click to remove')}`);
            } else {
                element.classList.remove('clicked');
                element.setAttribute('aria-pressed', 'false');
                element.setAttribute('aria-label', `${element.getAttribute('aria-label').replace('Selected - Click to remove', 'Click to add')}`);
            }
        }
    }
}

class NotificationManager {
    static showAlert(message) {
        alert(message);
    }

    static showSuccess() {
        NotificationManager.showAlert("🎊🎉Поздравляю 🎉🎊\n Вы Собрали автомобиль\n🎊🎉🎊🎉🎊");
    }

    static showAlreadySelected() {
        NotificationManager.showAlert('эта делать уже выбрана и добавлена в корзину');
    }

    static updateTitle(title) {
        document.title = title;
    }

    static createTitleFlasher() {
        let flashCount = 0;
        const flasher = setInterval(() => {
            document.title = flashCount % 2 ? "🎉 Поздравляю! 🎉" : " 🚗 Машина собрана 🚗";
            flashCount++;
            if (flashCount > 6) {
                clearInterval(flasher);
            }
        }, 500);
    }
}

class EcwidIntegration {
    static addProduct(productId, callback) {
        try {
            if (window.Ecwid && window.Ecwid.Cart) {
                Ecwid.Cart.addProduct(productId, (result) => {
                    if (result && result.id) {
                        console.log(`Ecwid success: Product ${productId} added`);
                    }
                    if (callback) callback(result);
                });
            } else {
                console.log(`Local cart: Product ${productId} added`);
                if (callback) callback({ success: true });
            }
        } catch (error) {
            console.log('Ecwid error but continuing:', error);
            if (callback) callback({ error });
        }
    }

    static removeProduct(productId) {
        try {
            if (window.Ecwid && window.Ecwid.Cart) {

                console.log(`Would remove from Ecwid: Product ${productId}`);
            } else {
                console.log(`Local cart removal: Product ${productId}`);
            }
        } catch (error) {
            console.log('Ecwid removal error:', error);
        }
    }

    static initialize() {
        console.log("Ecwid ready");

        if (window.Ecwid) {
            Ecwid.init();

            if (Ecwid.OnCartChanged) {
                Ecwid.OnCartChanged.add((cart) => {
                    console.log("Cart changed externally", cart?.items?.length || 0);
                });
            }
        }
    }
}

class CarConfigurator {
    constructor() {
        this.parts = new Map();
        this.cartManager = new CartManager();
        this.uiManager = new UIManager();
        this.isCompleted = false;
        this.totalPartsCount = 0;

        this.initializeParts();
        this.setupEventListeners();
        this.updateDisplay();
    }
    initializeParts() {
        const partsData = {
            "car-body": { productId: 264179002, name: "Car Body" },
            "car-roof": { productId: 96397398, name: "Car Roof" },
            "car-window": { productId: 264181001, name: "Car Window" },
            "wheel-rear": { productId: 264121059, name: "Rear Wheel" },
            "wheel-front": { productId: 264156021, name: "Front Wheel" }
        };

        Object.entries(partsData).forEach(([id, data]) => {
            this.parts.set(id, new CarPart(id, data.productId, data.name));
        });

        this.totalPartsCount = this.parts.size;
    }

    setupEventListeners() {
        this.parts.forEach((part, partId) => {
            const element = document.getElementById(partId);
            if (element) {
                element.addEventListener('click', () => this.handlePartClick(partId));
                console.log(`Setup ${partId}`);
            } else {
                console.warn(`Missing element: ${partId}`);
            }
        });

        this.setupKeyboardShortcuts();
        this.adjustForMobile();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'r' && event.ctrlKey) {
                event.preventDefault();
                location.reload();
            }
        });

        this.setupKonamiCode();
    }
}
adjustForMobile() {
    const title = document.querySelector("h1");
    if (title && window.innerWidth < 600) {
        title.style.fontSize = "2rem";
    }
}
handlePartClick(partId) {
    const part = this.parts.get(partId);
    if (!part) return;

    if (part.isSelected) {
        this.removePart(partId);
    } else {
        this.addPart(partId);
    }
}
addPart(partId) {
    const part = this.parts.get(partId);
    if (!part) return;

    part.select();
    this.cartManager.addItem(partId);
    this.uiManager.updatePartVisualState(partId, true);
    this.updateDisplay();

    console.log(`Adding ${part.name} (ID: ${part.productId})`);

    EcwidIntegration.addProduct(part.productId, () => {
        this.checkCompletion();
    });
}

removePart(partId) {
    const part = this.parts.get(partId);
    if (!part || !part.isSelected) return;

    part.deselect();
    this.cartManager.removeItem(partId);
    this.uiManager.updatePartVisualState(partId, false);
    this.updateDisplay();

    if (this.cartManager.getCount() < this.totalPartsCount) {
        this.resetCompletionState();
    }

    console.log(`Removing ${part.name} (ID: ${part.productId})`);
    EcwidIntegration.removeProduct(part.productId);
}

updateDisplay() {
    const selectedParts = this.cartManager.getAllItems();
    const partNames = {};

    this.parts.forEach((part, id) => {
        partNames[id] = part.name;
    });

    this.uiManager.updatePartsList(selectedParts, partNames, (partId) => {
        this.removePart(partId);
    });
}

checkCompletion() {
    if (this.isCompleted) return;

    if (this.cartManager.getCount() >= this.totalPartsCount) {
        this.handleCompletion();
    }
}

handleCompletion() {
    this.isCompleted = true;

    setTimeout(() => {
        this.uiManager.showSuccessState();
        NotificationManager.showSuccess();
        NotificationManager.updateTitle("🎉 Car Complete! 🎉");
        NotificationManager.createTitleFlasher();
    }, 300);
}

resetCompletionState() {
    this.isCompleted = false;
    this.uiManager.showConfigurationState();
    NotificationManager.updateTitle("Car Configurator");
}

getPartNames() {
    const names = {};
    this.parts.forEach((part, id) => {
        names[id] = part.name;
    });
    return names;
}
}

class Application {
    static initialize() {
        console.log("Initializing Car Configurator...");

        document.addEventListener('DOMContentLoaded', () => {
            new CarConfigurator();
        });

        window.ecwid_script_defer = true;
        window.ecwid_on_body_load = () => {
            EcwidIntegration.initialize();
        };
    }
}
Application.initialize();
