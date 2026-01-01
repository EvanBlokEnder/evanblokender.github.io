// This file would be loaded by the bookmarklet
// For simplicity, we'll include the core functionality here

(function() {
    // Check if Dev Tools are already injected
    if (window.devToolsInjected) return;
    window.devToolsInjected = true;
    
    // Create Dev Tools panel
    const devToolsHTML = `
        <div id="mobileDevTools" style="
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #1e1e1e;
            color: white;
            border-top: 2px solid #007acc;
            z-index: 999999;
            font-family: 'Segoe UI', sans-serif;
        ">
            <div style="padding: 10px; border-bottom: 1px solid #333;">
                <button onclick="toggleDevTools()" style="
                    background: #007acc;
                    color: white;
                    border: none;
                    padding: 8px 15px;
                    border-radius: 4px;
                    cursor: pointer;
                ">
                    <i>🛠</i> Dev Tools
                </button>
                <button onclick="clearConsole()" style="
                    background: #666;
                    color: white;
                    border: none;
                    padding: 8px 15px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-left: 10px;
                ">
                    Clear Console
                </button>
            </div>
            <div id="devToolsContent" style="
                display: none;
                height: 300px;
                overflow-y: auto;
                padding: 10px;
            ">
                <textarea id="consoleInput" placeholder="Enter JavaScript code..." style="
                    width: 100%;
                    height: 80px;
                    background: #2d2d30;
                    color: white;
                    border: 1px solid #444;
                    padding: 10px;
                    font-family: monospace;
                "></textarea>
                <button onclick="runCode()" style="
                    background: #007acc;
                    color: white;
                    border: none;
                    padding: 8px 15px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 10px;
                ">
                    Run Code
                </button>
                <div id="consoleOutput" style="
                    margin-top: 20px;
                    background: #2d2d30;
                    padding: 10px;
                    border-radius: 4px;
                    font-family: monospace;
                    font-size: 12px;
                "></div>
            </div>
        </div>
    `;
    
    // Add to page
    document.body.insertAdjacentHTML('beforeend', devToolsHTML);
    
    // Override console
    const originalConsole = { ...console };
    const output = document.getElementById('consoleOutput');
    
    ['log', 'error', 'warn', 'info'].forEach(method => {
        console[method] = (...args) => {
            originalConsole[method].apply(console, args);
            const message = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            
            const div = document.createElement('div');
            div.style.color = method === 'error' ? '#f48771' : 
                             method === 'warn' ? '#dcdcaa' : 'white';
            div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            output.appendChild(div);
            output.scrollTop = output.scrollHeight;
        };
    });
    
    // Add global functions
    window.toggleDevTools = function() {
        const content = document.getElementById('devToolsContent');
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
    };
    
    window.clearConsole = function() {
        document.getElementById('consoleOutput').innerHTML = '';
    };
    
    window.runCode = function() {
        const code = document.getElementById('consoleInput').value;
        try {
            const result = eval(code);
            console.log('Result:', result);
        } catch (error) {
            console.error('Error:', error.message);
        }
    };
    
    console.log('Dev Tools injected successfully!');
})();
