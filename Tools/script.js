class DevToolsInjector {
    constructor() {
        this.currentUrl = 'https://google.com';
        this.isDevToolsOpen = false;
        this.isInspecting = false;
        this.networkRequests = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupConsole();
        this.loadSettings();
    }

    bindEvents() {
        // Main controls
        document.getElementById('openTab').addEventListener('click', () => this.openModdedTab());
        document.getElementById('clearUrl').addEventListener('click', () => {
            document.getElementById('urlInput').value = '';
        });
        document.getElementById('bookmarkletBtn').addEventListener('click', () => this.createBookmarklet());
        
        // Dev Tools controls
        document.getElementById('closeDevTools').addEventListener('click', () => this.closeDevTools());
        document.getElementById('toggleDevTools').addEventListener('click', () => this.toggleDevTools());
        
        // Tab switching
        document.querySelectorAll('.devtools-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target));
        });
        
        // Console controls
        document.getElementById('clearConsole').addEventListener('click', () => this.clearConsole());
        document.getElementById('runCode').addEventListener('click', () => this.runConsoleCode());
        document.getElementById('consoleInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) this.runConsoleCode();
        });
        
        // Elements controls
        document.getElementById('inspectBtn').addEventListener('click', () => this.toggleInspectMode());
        document.getElementById('refreshDOM').addEventListener('click', () => this.refreshDOMTree());
        
        // Network controls
        document.getElementById('clearNetwork').addEventListener('click', () => this.clearNetworkLogs());
        document.getElementById('recordNetwork').addEventListener('click', (e) => this.toggleNetworkRecording(e.target));
        
        // Storage controls
        document.getElementById('storageType').addEventListener('change', () => this.loadStorageData());
        document.getElementById('clearStorage').addEventListener('click', () => this.clearStorage());
        
        // Sources controls
        document.getElementById('viewSource').addEventListener('click', () => this.viewPageSource());
        
        // Modded tab controls
        document.getElementById('closeTab').addEventListener('click', () => this.closeModdedTab());
        document.getElementById('backBtn').addEventListener('click', () => this.navigateBack());
        document.getElementById('forwardBtn').addEventListener('click', () => this.navigateForward());
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshFrame());
        document.getElementById('moddedUrlInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.navigateToUrl(e.target.value);
        });
        document.getElementById('openDevTools').addEventListener('click', () => this.showDevTools());
        
        // Settings
        document.getElementById('themeSelect').addEventListener('change', (e) => this.changeTheme(e.target.value));
        
        // Handle iframe navigation
        this.setupFrameNavigation();
    }

    setupConsole() {
        // Override console methods to capture output
        const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };

        const output = document.getElementById('consoleOutput');
        
        ['log', 'error', 'warn', 'info'].forEach(method => {
            console[method] = (...args) => {
                originalConsole[method].apply(console, args);
                if (document.getElementById('enableConsole').checked) {
                    const message = args.map(arg => 
                        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                    ).join(' ');
                    
                    const div = document.createElement('div');
                    div.className = method;
                    div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
                    output.appendChild(div);
                    output.scrollTop = output.scrollHeight;
                }
            };
        });
    }

    openModdedTab() {
        const urlInput = document.getElementById('urlInput');
        let url = urlInput.value.trim();
        
        if (!url) {
            alert('Please enter a URL');
            return;
        }
        
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        
        this.currentUrl = url;
        
        // Show modded tab
        document.getElementById('moddedTab').classList.add('active');
        document.getElementById('moddedUrlInput').value = url;
        
        // Load URL in iframe
        const frame = document.getElementById('moddedFrame');
        frame.src = url;
        
        // Inject Dev Tools into the iframe
        this.injectDevToolsIntoFrame(frame);
    }

    injectDevToolsIntoFrame(frame) {
        // Wait for frame to load
        frame.addEventListener('load', () => {
            try {
                const frameDoc = frame.contentDocument || frame.contentWindow.document;
                
                // Inject Dev Tools script
                const script = frameDoc.createElement('script');
                script.textContent = `
                    // Override console methods to capture output
                    (function() {
                        const originalConsole = { ...console };
                        
                        ['log', 'error', 'warn', 'info'].forEach(method => {
                            console[method] = (...args) => {
                                originalConsole[method].apply(console, args);
                                window.parent.postMessage({
                                    type: 'console',
                                    method: method,
                                    args: args.map(arg => 
                                        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                                    )
                                }, '*');
                            };
                        });
                        
                        // Listen for commands from parent
                        window.addEventListener('message', (event) => {
                            if (event.data.type === 'consoleCommand') {
                                try {
                                    const result = eval(event.data.code);
                                    window.parent.postMessage({
                                        type: 'consoleResult',
                                        result: result
                                    }, '*');
                                } catch (error) {
                                    window.parent.postMessage({
                                        type: 'consoleError',
                                        error: error.message
                                    }, '*');
                                }
                            }
                        });
                    })();
                `;
                frameDoc.head.appendChild(script);
                
                // Update URL in address bar
                document.getElementById('moddedUrlInput').value = frame.src;
                
                // Load page source
                this.loadPageSource(frameDoc);
                
            } catch (error) {
                console.error('Error injecting Dev Tools:', error);
            }
        });
        
        // Listen for messages from iframe
        window.addEventListener('message', (event) => {
            this.handleFrameMessage(event);
        });
    }

    handleFrameMessage(event) {
        if (!event.data.type) return;
        
        switch (event.data.type) {
            case 'console':
                this.handleConsoleMessage(event.data);
                break;
            case 'consoleResult':
                this.logToConsole(`Result: ${event.data.result}`);
                break;
            case 'consoleError':
                this.logToConsole(`Error: ${event.data.error}`, 'error');
                break;
        }
    }

    handleConsoleMessage(data) {
        if (!document.getElementById('enableConsole').checked) return;
        
        const output = document.getElementById('consoleOutput');
        const div = document.createElement('div');
        div.className = data.method;
        div.textContent = `[${new Date().toLocaleTimeString()}] ${data.args.join(' ')}`;
        output.appendChild(div);
        output.scrollTop = output.scrollHeight;
    }

    logToConsole(message, type = 'log') {
        const output = document.getElementById('consoleOutput');
        const div = document.createElement('div');
        div.className = type;
        div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        output.appendChild(div);
        output.scrollTop = output.scrollHeight;
    }

    runConsoleCode() {
        const code = document.getElementById('consoleInput').value;
        if (!code.trim()) return;
        
        const frame = document.getElementById('moddedFrame');
        try {
            frame.contentWindow.postMessage({
                type: 'consoleCommand',
                code: code
            }, '*');
            
            this.logToConsole(`> ${code}`, 'log');
        } catch (error) {
            this.logToConsole(`Error: ${error.message}`, 'error');
        }
    }

    clearConsole() {
        document.getElementById('consoleOutput').innerHTML = '';
    }

    switchTab(tabElement) {
        // Remove active class from all tabs
        document.querySelectorAll('.devtools-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Add active class to clicked tab
        tabElement.classList.add('active');
        
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Show selected tab content
        const tabId = tabElement.getAttribute('data-tab');
        document.getElementById(`${tabId}Tab`).classList.add('active');
    }

    toggleInspectMode() {
        this.isInspecting = !this.isInspecting;
        const btn = document.getElementById('inspectBtn');
        
        if (this.isInspecting) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-mouse-pointer"></i> Stop Inspect';
            this.enableInspectMode();
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="fas fa-mouse-pointer"></i> Inspect';
            this.disableInspectMode();
        }
    }

    enableInspectMode() {
        const frame = document.getElementById('moddedFrame');
        if (!frame.contentWindow) return;
        
        const script = `
            (function() {
                const style = document.createElement('style');
                style.textContent = \`
                    *:hover {
                        outline: 2px solid #007acc !important;
                        background-color: rgba(0, 122, 204, 0.1) !important;
                        cursor: pointer !important;
                    }
                \`;
                document.head.appendChild(style);
                
                document.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Send element info to parent
                    window.parent.postMessage({
                        type: 'elementSelected',
                        html: e.target.outerHTML,
                        xpath: getXPath(e.target)
                    }, '*');
                    
                    return false;
                }, true);
                
                function getXPath(element) {
                    if (element.id !== '') return '//*[@id="' + element.id + '"]';
                    if (element === document.body) return '/html/body';
                    
                    let ix = 0;
                    const siblings = element.parentNode.childNodes;
                    
                    for (let i = 0; i < siblings.length; i++) {
                        const sibling = siblings[i];
                        if (sibling === element) {
                            return getXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
                        }
                        if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
                            ix++;
                        }
                    }
                }
            })();
        `;
        
        try {
            frame.contentWindow.eval(script);
        } catch (error) {
            console.error('Error enabling inspect mode:', error);
        }
    }

    disableInspectMode() {
        const frame = document.getElementById('moddedFrame');
        if (!frame.contentWindow) return;
        
        try {
            frame.contentWindow.eval(`
                document.querySelectorAll('style').forEach(style => {
                    if (style.textContent.includes('*:hover')) style.remove();
                });
                document.removeEventListener('click', arguments.callee, true);
            `);
        } catch (error) {
            console.error('Error disabling inspect mode:', error);
        }
    }

    refreshDOMTree() {
        const frame = document.getElementById('moddedFrame');
        if (!frame.contentWindow || !frame.contentDocument) return;
        
        const domTree = document.getElementById('domTree');
        domTree.innerHTML = '';
        
        const walker = document.createTreeWalker(
            frame.contentDocument.documentElement,
            NodeFilter.SHOW_ELEMENT,
            null,
            false
        );
        
        const rootNode = document.createElement('div');
        rootNode.className = 'dom-node';
        rootNode.innerHTML = `
            <span class="toggle">▶</span>
            <span class="tag">&lt;html&gt;</span>
        `;
        
        domTree.appendChild(rootNode);
        
        let node = walker.nextNode();
        let count = 0;
        while (node && count < 100) { // Limit to 100 elements for performance
            const nodeElement = document.createElement('div');
            nodeElement.className = 'dom-node';
            nodeElement.style.paddingLeft = '20px';
            nodeElement.innerHTML = `
                <span class="toggle">▶</span>
                <span class="tag">&lt;${node.tagName.toLowerCase()}&gt;</span>
            `;
            
            rootNode.appendChild(nodeElement);
            node = walker.nextNode();
            count++;
        }
    }

    toggleNetworkRecording(button) {
        button.classList.toggle('active');
        if (button.classList.contains('active')) {
            this.startNetworkRecording();
        } else {
            this.stopNetworkRecording();
        }
    }

    startNetworkRecording() {
        // This is a simplified version - in a real implementation,
        // you would use Service Workers or proxy the requests
        const frame = document.getElementById('moddedFrame');
        if (!frame.contentWindow) return;
        
        this.logToConsole('Network recording started', 'info');
    }

    clearNetworkLogs() {
        document.getElementById('networkLogs').innerHTML = '';
        this.networkRequests = [];
    }

    loadStorageData() {
        const type = document.getElementById('storageType').value;
        const contentDiv = document.getElementById('storageContent');
        
        let items = [];
        
        try {
            const frame = document.getElementById('moddedFrame');
            if (frame.contentWindow) {
                switch (type) {
                    case 'localStorage':
                        items = Object.entries(frame.contentWindow.localStorage || {});
                        break;
                    case 'sessionStorage':
                        items = Object.entries(frame.contentWindow.sessionStorage || {});
                        break;
                    case 'cookies':
                        items = document.cookie.split(';').map(cookie => {
                            const [name, value] = cookie.trim().split('=');
                            return [name, value];
                        });
                        break;
                }
            }
        } catch (error) {
            console.error('Error loading storage:', error);
        }
        
        contentDiv.innerHTML = '';
        
        items.forEach(([key, value]) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'storage-item';
            itemDiv.innerHTML = `
                <span class="storage-key">${key}</span>
                <span class="storage-value">${value}</span>
            `;
            contentDiv.appendChild(itemDiv);
        });
    }

    clearStorage() {
        const type = document.getElementById('storageType').value;
        const frame = document.getElementById('moddedFrame');
        
        if (!frame.contentWindow) return;
        
        try {
            switch (type) {
                case 'localStorage':
                    frame.contentWindow.localStorage.clear();
                    break;
                case 'sessionStorage':
                    frame.contentWindow.sessionStorage.clear();
                    break;
                case 'cookies':
                    // Note: Cannot clear cookies due to browser security restrictions
                    this.logToConsole('Cannot clear cookies due to browser security restrictions', 'warn');
                    break;
            }
            
            this.loadStorageData();
            this.logToConsole(`${type} cleared`, 'info');
        } catch (error) {
            this.logToConsole(`Error clearing ${type}: ${error.message}`, 'error');
        }
    }

    viewPageSource() {
        const frame = document.getElementById('moddedFrame');
        if (!frame.contentDocument) return;
        
        const source = frame.contentDocument.documentElement.outerHTML;
        const formattedSource = this.formatHTML(source);
        
        document.getElementById('pageSource').textContent = formattedSource;
    }

    loadPageSource(frameDoc) {
        if (!frameDoc) return;
        
        const source = frameDoc.documentElement.outerHTML;
        const formattedSource = this.formatHTML(source);
        document.getElementById('pageSource').textContent = formattedSource;
    }

    formatHTML(html) {
        // Simple HTML formatting
        const tab = '  ';
        let result = '';
        let indent = '';
        
        html.split(/>\s*</).forEach(element => {
            if (element.match(/^\/\w/)) {
                indent = indent.substring(tab.length);
            }
            
            result += indent + '<' + element + '>\r\n';
            
            if (element.match(/^<?\w[^>]*[^/]$/) && !element.startsWith('!--')) {
                indent += tab;
            }
        });
        
        return result.replace(/<\/?(html|head|body)>/g, '').trim();
    }

    setupFrameNavigation() {
        const frame = document.getElementById('moddedFrame');
        
        frame.addEventListener('load', () => {
            document.getElementById('moddedUrlInput').value = frame.src;
            
            // Reload Dev Tools injection if persistence is enabled
            if (document.getElementById('persistSession').checked) {
                this.injectDevToolsIntoFrame(frame);
            }
            
            // Refresh DOM tree if needed
            if (document.getElementById('elementsTab').classList.contains('active')) {
                this.refreshDOMTree();
            }
            
            // Update storage view
            this.loadStorageData();
        });
    }

    navigateBack() {
        const frame = document.getElementById('moddedFrame');
        try {
            frame.contentWindow.history.back();
        } catch (error) {
            console.error('Error navigating back:', error);
        }
    }

    navigateForward() {
        const frame = document.getElementById('moddedFrame');
        try {
            frame.contentWindow.history.forward();
        } catch (error) {
            console.error('Error navigating forward:', error);
        }
    }

    refreshFrame() {
        const frame = document.getElementById('moddedFrame');
        frame.src = frame.src;
    }

    navigateToUrl(url) {
        if (!url) return;
        
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        
        document.getElementById('moddedFrame').src = url;
    }

    closeModdedTab() {
        document.getElementById('moddedTab').classList.remove('active');
        document.getElementById('moddedFrame').src = 'about:blank';
    }

    showDevTools() {
        this.isDevToolsOpen = true;
        document.getElementById('devToolsPanel').classList.add('expanded');
        document.getElementById('toggleDevTools').innerHTML = '<i class="fas fa-chevron-down"></i>';
    }

    closeDevTools() {
        this.isDevToolsOpen = false;
        document.getElementById('devToolsPanel').classList.remove('expanded');
    }

    toggleDevTools() {
        this.isDevToolsOpen = !this.isDevToolsOpen;
        const panel = document.getElementById('devToolsPanel');
        const toggleBtn = document.getElementById('toggleDevTools');
        
        if (this.isDevToolsOpen) {
            panel.classList.add('expanded');
            toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
        } else {
            panel.classList.remove('expanded');
            toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
        }
    }

    changeTheme(theme) {
        document.body.className = '';
        if (theme === 'dark') {
            document.body.style.setProperty('--background-color', '#1e1e1e');
            document.body.style.setProperty('--surface-color', '#252526');
            document.body.style.setProperty('--text-color', '#cccccc');
        } else if (theme === 'light') {
            document.body.style.setProperty('--background-color', '#f5f5f5');
            document.body.style.setProperty('--surface-color', '#ffffff');
            document.body.style.setProperty('--text-color', '#333333');
        } else if (theme === 'chrome') {
            document.body.style.setProperty('--background-color', '#ffffff');
            document.body.style.setProperty('--surface-color', '#f8f9fa');
            document.body.style.setProperty('--text-color', '#202124');
            document.body.style.setProperty('--primary-color', '#1a73e8');
        }
    }

    createBookmarklet() {
        const bookmarkletCode = `
            javascript:(function(){
                var script=document.createElement('script');
                script.src='${window.location.origin}/devtools-injector.js';
                document.head.appendChild(script);
            })();
        `.replace(/\s+/g, ' ').trim();
        
        prompt('Drag this link to your bookmarks bar, or copy the code:', bookmarkletCode);
    }

    loadSettings() {
        // Load saved settings from localStorage
        const settings = JSON.parse(localStorage.getItem('devToolsSettings') || '{}');
        
        if (settings.theme) {
            document.getElementById('themeSelect').value = settings.theme;
            this.changeTheme(settings.theme);
        }
        
        ['enableConsole', 'enableInspector', 'enableNetwork', 'enableStorage', 'persistSession'].forEach(id => {
            if (settings[id] !== undefined) {
                document.getElementById(id).checked = settings[id];
            }
        });
        
        // Save settings when changed
        document.querySelectorAll('input[type="checkbox"], select').forEach(element => {
            element.addEventListener('change', () => this.saveSettings());
        });
    }

    saveSettings() {
        const settings = {
            theme: document.getElementById('themeSelect').value,
            enableConsole: document.getElementById('enableConsole').checked,
            enableInspector: document.getElementById('enableInspector').checked,
            enableNetwork: document.getElementById('enableNetwork').checked,
            enableStorage: document.getElementById('enableStorage').checked,
            persistSession: document.getElementById('persistSession').checked
        };
        
        localStorage.setItem('devToolsSettings', JSON.stringify(settings));
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new DevToolsInjector();
});
