// Stellar Wallet Simulation
let currentWallet = null;
let currentSplitData = null;
let nextPersonId = 4;
let transactions = [];
let walletBalance = 10000; // Starting balance in XLM

// Generate Stellar-like wallet address
function generateStellarAddress() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let address = 'G';
    for (let i = 0; i < 55; i++) {
        address += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return address;
}

// Connect Wallet
function connectWallet() {
    try {
        const publicKey = generateStellarAddress();
        const secretKey = 'S' + generateStellarAddress().substring(1);
        
        currentWallet = {
            publicKey: publicKey,
            secretKey: secretKey,
            balance: walletBalance
        };
        
        document.getElementById('walletAddress').innerHTML = `${publicKey.slice(0, 8)}...${publicKey.slice(-6)}`;
        document.getElementById('walletSecret').innerHTML = `Secret: ${secretKey.slice(0, 8)}... (hidden)`;
        document.getElementById('walletSecret').style.display = 'block';
        
        // Update balance display
        document.getElementById('xlmBalance').innerHTML = `${currentWallet.balance.toFixed(2)} <span>XLM</span>`;
        
        showNotification('Stellar wallet generated successfully! Balance: 10,000 XLM', 'success');
        
        // Enable send button if split is calculated
        if (currentSplitData) {
            document.getElementById('sendPaymentsBtn').style.display = 'block';
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Failed to generate wallet: ' + error.message, 'error');
    }
}

// Add Person
function addPerson() {
    const peopleList = document.getElementById('peopleList');
    const personDiv = document.createElement('div');
    personDiv.className = 'person-item';
    personDiv.setAttribute('data-id', nextPersonId);
    personDiv.innerHTML = `
        <input type="text" class="person-name" placeholder="Person name" value="Person ${nextPersonId + 1}">
        <input type="text" class="person-address" placeholder="Stellar wallet address (G...)" value="${generateStellarAddress()}">
        <input type="number" class="person-amount" placeholder="Amount in XLM" step="0.0000001" readonly style="background: #f5f5f5;">
        <button class="remove-person" onclick="removePerson(${nextPersonId})">×</button>
    `;
    peopleList.appendChild(personDiv);
    nextPersonId++;
    showNotification('Person added successfully!', 'success');
}

// Remove Person
function removePerson(id) {
    const peopleList = document.getElementById('peopleList');
    const persons = peopleList.getElementsByClassName('person-item');
    
    if (persons.length <= 1) {
        showNotification('At least one person is required!', 'error');
        return;
    }
    
    const personToRemove = Array.from(persons).find(person => 
        parseInt(person.getAttribute('data-id')) === id
    );
    
    if (personToRemove) {
        personToRemove.remove();
        showNotification('Person removed', 'success');
        if (document.getElementById('results').style.display === 'block') {
            calculateSplit();
        }
    }
}

// Calculate Split
function calculateSplit() {
    const totalAmountUSD = parseFloat(document.getElementById('totalAmount').value);
    const xlmRate = parseFloat(document.getElementById('xlmRate').value);
    
    if (isNaN(totalAmountUSD) || totalAmountUSD <= 0) {
        showNotification('Please enter a valid total amount!', 'error');
        return;
    }
    
    if (isNaN(xlmRate) || xlmRate <= 0) {
        showNotification('Please enter a valid XLM rate!', 'error');
        return;
    }
    
    const totalXLMNeeded = totalAmountUSD / xlmRate;
    const persons = document.getElementsByClassName('person-item');
    const personCount = persons.length;
    const eachPersonXLM = totalXLMNeeded / personCount;
    
    // Update each person's amount field
    for (let person of persons) {
        const amountInput = person.querySelector('.person-amount');
        amountInput.value = eachPersonXLM.toFixed(7);
    }
    
    // Display results
    document.getElementById('totalBillUSD').textContent = `$${totalAmountUSD.toFixed(2)}`;
    document.getElementById('xlmRateDisplay').textContent = `1 XLM = $${xlmRate.toFixed(4)}`;
    document.getElementById('totalXLM').textContent = `${totalXLMNeeded.toFixed(7)} XLM`;
    
    const individualSplitsDiv = document.getElementById('individualSplits');
    individualSplitsDiv.innerHTML = '<h4 style="margin: 15px 0 10px 0;">👥 Per Person (XLM):</h4>';
    
    const splitResults = [];
    for (let i = 0; i < persons.length; i++) {
        const person = persons[i];
        const name = person.querySelector('.person-name').value;
        const amount = parseFloat(person.querySelector('.person-amount').value);
        const address = person.querySelector('.person-address').value;
        
        splitResults.push({
            id: i,
            name: name,
            amount: amount,
            address: address
        });
        
        const splitItem = document.createElement('div');
        splitItem.className = 'result-item';
        splitItem.innerHTML = `
            <span class="result-label">${escapeHtml(name)}:</span>
            <span class="result-value">${amount.toFixed(7)} XLM</span>
        `;
        individualSplitsDiv.appendChild(splitItem);
    }
    
    document.getElementById('results').style.display = 'block';
    
    currentSplitData = {
        totalAmountUSD,
        xlmRate,
        totalXLM: totalXLMNeeded,
        splitResults
    };
    
    // Show send button if wallet is connected
    if (currentWallet) {
        document.getElementById('sendPaymentsBtn').style.display = 'block';
    }
    
    showNotification(`Split calculated! Each person pays: ${eachPersonXLM.toFixed(4)} XLM`, 'success');
}

// Send XLM Payments
async function sendPayments() {
    if (!currentSplitData) {
        showNotification('Please calculate the split first!', 'error');
        return;
    }
    
    if (!currentWallet) {
        showNotification('Please generate a wallet first!', 'error');
        return;
    }
    
    const persons = document.getElementsByClassName('person-item');
    const payments = [];
    
    // Collect payment data
    for (let person of persons) {
        const address = person.querySelector('.person-address').value.trim();
        const amount = parseFloat(person.querySelector('.person-amount').value);
        const name = person.querySelector('.person-name').value;
        
        if (!address) {
            showNotification(`Please enter Stellar address for ${name}!`, 'error');
            return;
        }
        
        if (isNaN(amount) || amount <= 0) {
            showNotification(`Invalid amount for ${name}!`, 'error');
            return;
        }
        
        payments.push({
            address,
            amount,
            name
        });
    }
    
    // Check balance
    const totalToSend = payments.reduce((sum, p) => sum + p.amount, 0);
    
    if (currentWallet.balance < totalToSend) {
        showNotification(`Insufficient balance! Need ${totalToSend.toFixed(4)} XLM, have ${currentWallet.balance.toFixed(4)} XLM`, 'error');
        return;
    }
    
    showNotification(`Sending ${payments.length} payments on Stellar network...`, 'info');
    
    // Send payments sequentially
    const sendButton = document.getElementById('sendPaymentsBtn');
    sendButton.disabled = true;
    sendButton.textContent = 'Processing Transactions...';
    
    let successCount = 0;
    
    for (let i = 0; i < payments.length; i++) {
        const payment = payments[i];
        
        // Simulate blockchain transaction delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        try {
            // Simulate successful transaction
            const txHash = '0x' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            
            // Deduct from balance
            currentWallet.balance -= payment.amount;
            
            successCount++;
            transactions.push({
                to: payment.address,
                toName: payment.name,
                amount: payment.amount,
                hash: txHash,
                timestamp: new Date().toLocaleString(),
                status: 'success',
                block: Math.floor(Math.random() * 1000000) + 50000000
            });
            
            showNotification(`✅ Sent ${payment.amount.toFixed(4)} XLM to ${payment.name}`, 'success');
            
        } catch (error) {
            showNotification(`❌ Failed to send to ${payment.name}: ${error.message}`, 'error');
            transactions.push({
                to: payment.address,
                toName: payment.name,
                amount: payment.amount,
                timestamp: new Date().toLocaleString(),
                status: 'failed',
                error: error.message
            });
        }
    }
    
    // Update balance display
    document.getElementById('xlmBalance').innerHTML = `${currentWallet.balance.toFixed(4)} <span>XLM</span>`;
    
    sendButton.disabled = false;
    sendButton.textContent = '💸 Send XLM Payments';
    
    // Update transaction history display
    displayTransactionHistory();
    
    if (successCount === payments.length) {
        showNotification(`🎉 All ${successCount} payments sent successfully on Stellar network!`, 'success');
        document.getElementById('transactionHistory').style.display = 'block';
    } else {
        showNotification(`Sent ${successCount}/${payments.length} payments. Check transaction history.`, 'info');
    }
}

// Display Transaction History
function displayTransactionHistory() {
    const transactionList = document.getElementById('transactionList');
    transactionList.innerHTML = '';
    
    if (transactions.length === 0) {
        transactionList.innerHTML = '<div style="text-align: center; padding: 20px;">No transactions yet</div>';
        return;
    }
    
    transactions.slice().reverse().forEach(tx => {
        const txDiv = document.createElement('div');
        txDiv.className = 'transaction-item';
        txDiv.style.borderLeftColor = tx.status === 'success' ? '#38ef7d' : '#ff4757';
        txDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong>${tx.toName}</strong>
                <span style="color: #11998e; font-weight: bold;">${tx.amount.toFixed(4)} XLM</span>
            </div>
            <div style="font-size: 10px; color: #666; margin-bottom: 5px;">
                <span>📤 To: ${tx.to.slice(0, 12)}...${tx.to.slice(-8)}</span>
            </div>
            <div style="font-size: 10px; color: #666; margin-bottom: 5px;">
                <span>⏱️ ${tx.timestamp}</span>
            </div>
            <div style="font-size: 10px; font-family: monospace; color: #999; margin-bottom: 5px;">
                <span>🔗 Hash: ${tx.hash ? tx.hash.slice(0, 16) + '...' : 'N/A'}</span>
            </div>
            <div style="font-size: 10px; color: ${tx.status === 'success' ? '#38ef7d' : '#ff4757'};">
                <span>${tx.status === 'success' ? '✅ Confirmed on Stellar' : '❌ ' + (tx.error || 'Failed')}</span>
            </div>
            ${tx.block ? `<div style="font-size: 9px; color: #999;">📦 Block: ${tx.block}</div>` : ''}
        `;
        transactionList.appendChild(txDiv);
    });
}

// Show Notification
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    const icon = document.getElementById('notificationIcon');
    const messageEl = document.getElementById('notificationMessage');
    
    notification.className = `notification ${type}`;
    
    if (type === 'success') {
        icon.textContent = '✅';
    } else if (type === 'error') {
        icon.textContent = '❌';
    } else {
        icon.textContent = 'ℹ️';
    }
    
    messageEl.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Run example
function runExample() {
    document.getElementById('totalAmount').value = '100';
    document.getElementById('xlmRate').value = '0.12';
    calculateSplit();
    showNotification('Example loaded! Total = $100, Rate = $0.12/XLM → Each pays: 208.3333 XLM', 'info');
}

// Auto-calculate on load
setTimeout(() => {
    if (document.getElementById('totalAmount').value) {
        calculateSplit();
    }
}, 500);