interface ReceiptItem {
    name: string;
    price: number;
}

class ReceiptPrinter {
    private device: BluetoothDevice | null = null;
    private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
    private items: ReceiptItem[] = [];

    constructor() {
        this.initializeEventListeners();
    }

    private initializeEventListeners(): void {
        const itemForm = document.getElementById('itemForm') as HTMLFormElement;
        const connectBtn = document.getElementById('connectBtn') as HTMLButtonElement;
        const printBtn = document.getElementById('printBtn') as HTMLButtonElement;

        itemForm.addEventListener('submit', (e) => this.addItem(e));
        connectBtn.addEventListener('click', () => this.connectToPrinter());
        printBtn.addEventListener('click', () => this.printReceipt());
    }

    private addItem(e: Event): void {
        e.preventDefault();
        
        const nameInput = document.getElementById('itemName') as HTMLInputElement;
        const priceInput = document.getElementById('itemPrice') as HTMLInputElement;
        
        const item: ReceiptItem = {
            name: nameInput.value.trim(),
            price: parseFloat(priceInput.value)
        };

        this.items.push(item);
        this.updateReceiptDisplay();
        
        nameInput.value = '';
        priceInput.value = '';
        nameInput.focus();
    }

    private updateReceiptDisplay(): void {
        const itemsContainer = document.getElementById('receiptItems')!;
        const totalElement = document.getElementById('totalAmount')!;

        itemsContainer.innerHTML = '';
        let total = 0;

        this.items.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'receipt-item';
            itemDiv.innerHTML = `
                <span>${item.name}</span>
                <span>$${item.price.toFixed(2)}</span>
                <button onclick="receiptPrinter.removeItem(${index})">×</button>
            `;
            itemsContainer.appendChild(itemDiv);
            total += item.price;
        });

        totalElement.textContent = total.toFixed(2);
    }

    removeItem(index: number): void {
        this.items.splice(index, 1);
        this.updateReceiptDisplay();
    }

    private async connectToPrinter(): Promise<void> {
        try {
            this.updateStatus('Connecting to printer...');
            
            // Request Bluetooth device (most thermal printers use Serial Port Profile)
            this.device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] // Serial service UUID
            });

            const server = await this.device.gatt!.connect();
            const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
            this.characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

            this.updateStatus('Connected to printer!');
            (document.getElementById('printBtn') as HTMLButtonElement).disabled = false;
            (document.getElementById('connectBtn') as HTMLButtonElement).textContent = 'Connected';
            
        } catch (error) {
            console.error('Connection failed:', error);
            this.updateStatus('Connection failed. Make sure printer is in pairing mode.');
        }
    }

    private async printReceipt(): Promise<void> {
        if (!this.characteristic || this.items.length === 0) {
            this.updateStatus('No items to print or printer not connected');
            return;
        }

        try {
            this.updateStatus('Printing...');
            
            const receipt = this.formatReceipt();
            const encoder = new TextEncoder();
            const data = encoder.encode(receipt);

            await this.characteristic.writeValue(data);
            this.updateStatus('Receipt printed successfully!');
            
        } catch (error) {
            console.error('Print failed:', error);
            this.updateStatus('Print failed. Check printer connection.');
        }
    }

    private formatReceipt(): string {
        const now = new Date();
        const dateStr = now.toLocaleDateString();
        const timeStr = now.toLocaleTimeString();
        
        let receipt = '\n';
        receipt += '================================\n';
        receipt += '         RECEIPT\n';
        receipt += '================================\n';
        receipt += `Date: ${dateStr}\n`;
        receipt += `Time: ${timeStr}\n`;
        receipt += '--------------------------------\n';
        
        this.items.forEach(item => {
            const name = item.name.padEnd(20);
            const price = `$${item.price.toFixed(2)}`.padStart(8);
            receipt += `${name}${price}\n`;
        });
        
        receipt += '--------------------------------\n';
        const total = this.items.reduce((sum, item) => sum + item.price, 0);
        receipt += `TOTAL:${`$${total.toFixed(2)}`.padStart(22)}\n`;
        receipt += '================================\n';
        receipt += '     Thank you for your business!\n';
        receipt += '================================\n\n\n';
        
        return receipt;
    }

    private updateStatus(message: string): void {
        const statusElement = document.getElementById('status')!;
        statusElement.textContent = message;
    }
}

// Initialize the app
const receiptPrinter = new ReceiptPrinter();

// Make it globally accessible for HTML onclick handlers
(window as any).receiptPrinter = receiptPrinter;
