interface ReceiptItem {
    name: string;
    price: number;
}

class ReceiptPrinter {
    private device: BluetoothDevice | null = null;
    private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
    private items: ReceiptItem[] = [];
    private currentMode: 'receipt' | 'text' = 'receipt';

    constructor() {
        this.initializeEventListeners();
    }

    private initializeEventListeners(): void {
        const itemForm = document.getElementById('itemForm') as HTMLFormElement;
        const connectBtn = document.getElementById('connectBtn') as HTMLButtonElement;
        const printBtn = document.getElementById('printBtn') as HTMLButtonElement;
        const sendTextBtn = document.getElementById('sendTextBtn') as HTMLButtonElement;
        const receiptModeBtn = document.getElementById('receiptModeBtn') as HTMLButtonElement;
        const textModeBtn = document.getElementById('textModeBtn') as HTMLButtonElement;

        itemForm.addEventListener('submit', (e) => this.addItem(e));
        connectBtn.addEventListener('click', () => this.connectToPrinter());
        printBtn.addEventListener('click', () => this.printReceipt());
        sendTextBtn.addEventListener('click', () => this.sendCustomText());
        receiptModeBtn.addEventListener('click', () => this.switchMode('receipt'));
        textModeBtn.addEventListener('click', () => this.switchMode('text'));
    }

    private switchMode(mode: 'receipt' | 'text'): void {
        this.currentMode = mode;
        
        const receiptMode = document.getElementById('receiptMode')!;
        const textMode = document.getElementById('textMode')!;
        const printBtn = document.getElementById('printBtn') as HTMLButtonElement;
        const sendTextBtn = document.getElementById('sendTextBtn') as HTMLButtonElement;
        const receiptModeBtn = document.getElementById('receiptModeBtn') as HTMLButtonElement;
        const textModeBtn = document.getElementById('textModeBtn') as HTMLButtonElement;

        if (mode === 'receipt') {
            receiptMode.classList.remove('hidden');
            textMode.classList.add('hidden');
            printBtn.classList.remove('hidden');
            sendTextBtn.classList.add('hidden');
            receiptModeBtn.classList.add('active');
            textModeBtn.classList.remove('active');
        } else {
            receiptMode.classList.add('hidden');
            textMode.classList.remove('hidden');
            printBtn.classList.add('hidden');
            sendTextBtn.classList.remove('hidden');
            receiptModeBtn.classList.remove('active');
            textModeBtn.classList.add('active');
        }

        // Update button states based on connection
        const isConnected = this.characteristic !== null;
        printBtn.disabled = !isConnected || this.items.length === 0;
        sendTextBtn.disabled = !isConnected;
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
        
        // Update print button state
        const printBtn = document.getElementById('printBtn') as HTMLButtonElement;
        printBtn.disabled = !this.characteristic || this.items.length === 0;
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
        
        // Update print button state
        const printBtn = document.getElementById('printBtn') as HTMLButtonElement;
        printBtn.disabled = !this.characteristic || this.items.length === 0;
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
            (document.getElementById('connectBtn') as HTMLButtonElement).textContent = 'Connected';
            
            // Update button states based on current mode
            const printBtn = document.getElementById('printBtn') as HTMLButtonElement;
            const sendTextBtn = document.getElementById('sendTextBtn') as HTMLButtonElement;
            printBtn.disabled = this.items.length === 0;
            sendTextBtn.disabled = false;
            
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
            await this.sendTextInChunks(receipt);
            this.updateStatus('Receipt printed successfully!');
            
        } catch (error) {
            console.error('Print failed:', error);
            this.updateStatus('Print failed. Check printer connection.');
        }
    }

    private async sendCustomText(): Promise<void> {
        if (!this.characteristic) {
            this.updateStatus('Printer not connected');
            return;
        }

        const textArea = document.getElementById('customText') as HTMLTextAreaElement;
        const customText = textArea.value.trim();

        if (!customText) {
            this.updateStatus('Please enter text to print');
            return;
        }

        try {
            this.updateStatus('Sending text...');
            
            await this.sendTextInChunks(customText + '\n\n\n');
            this.updateStatus('Text sent successfully!');
            
        } catch (error) {
            console.error('Send failed:', error);
            this.updateStatus('Send failed. Check printer connection.');
        }
    }

    private cleanTextForPrinter(text: string): string {
        return text
            // Replace common Unicode quotes with ASCII equivalents
            .replace(/[""]/g, '"')
            .replace(/['']/g, "'")
            .replace(/[–—]/g, '-')
            .replace(/[…]/g, '...')
            // Keep only printable ASCII + essential whitespace
            .replace(/[^\x20-\x7E\n\r\t]/g, '')
            // Remove other control characters except newlines, carriage returns, and tabs
            .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
            // Normalize line endings to just \n
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');
    }

    private async sendTextInChunks(text: string): Promise<void> {
        const cleanText = this.cleanTextForPrinter(text);
        const encoder = new TextEncoder();
        const maxChunkSize = 512; // Bluetooth characteristic limit
        
        let offset = 0;
        while (offset < cleanText.length) {
            // Find the largest substring that fits within the byte limit
            let chunkText = '';
            let currentOffset = offset;
            
            while (currentOffset < cleanText.length) {
                const nextChar = cleanText[currentOffset];
                const testText = chunkText + nextChar;
                const testBytes = encoder.encode(testText);
                
                if (testBytes.length > maxChunkSize) {
                    break;
                }
                
                chunkText = testText;
                currentOffset++;
            }
            
            // If we couldn't fit any characters, force at least one
            if (chunkText === '' && currentOffset < cleanText.length) {
                chunkText = cleanText[currentOffset];
                currentOffset++;
            }
            
            const data = encoder.encode(chunkText);
            await this.characteristic!.writeValue(data);
            
            offset = currentOffset;
            
            // Small delay between chunks to ensure reliable transmission
            if (offset < cleanText.length) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
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
