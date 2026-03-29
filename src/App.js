const { ipcRenderer } = require('electron');

const logs = document.getElementById("terminal-logs");
const targetInput = document.getElementById("targetInput");
const vulnTargetInput = document.getElementById("vulnTargetInput");
const resultsBody = document.getElementById("resultsBody");
const vulnResultsBody = document.getElementById("vulnResultsBody");

function addLog(text, type = "system") {
    const div = document.createElement("div");
    div.className = `log-entry ${type}`;
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
    div.innerHTML = `<span style="color: #555">[${time}]</span> <span style="color: #a371ff">$</span> ${text}`;
    logs.appendChild(div);
    logs.scrollTop = logs.scrollHeight;
}

document.querySelectorAll(".nav-icon").forEach(icon => {
    icon.addEventListener("click", () => {
        const viewId = `view-${icon.id.split('-')[1]}`;
        
        // Update UI
        document.querySelectorAll(".nav-icon").forEach(i => i.classList.remove("active"));
        document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
        
        icon.classList.add("active");
        document.getElementById(viewId).classList.add("active");
        
        addLog(`MODULE_LOADED: ${viewId.toUpperCase()}`);
    });
});

document.getElementById("scanBtn").onclick = () => {
    const target = targetInput.value;
    if (!target) {
        addLog("ERROR: No target specified for Nmap", "red");
        return;
    }

    resultsBody.innerHTML = "<tr><td colspan='6' class='empty-state'>RUNNING_NMAP_PROCESS...</td></tr>";
    addLog(`Launching real-time scan on ${target}...`);
    

    ipcRenderer.send('run-nmap', target);
};

ipcRenderer.on('nmap-result', (event, data) => {
    resultsBody.innerHTML = "";
    const lines = data.split('\n');
    let portCount = 0;

    lines.forEach(line => {
       
        const match = line.match(/^(\d+)\/(tcp|udp)\s+(\w+)\s+(.*)$/);
        if (match) {
            portCount++;
            const row = `
                <tr>
                    <td style="color: #fff">${match[1]}</td>
                    <td>${match[2].toUpperCase()}</td>
                    <td style="color: #00d1ff">${match[4].trim()}</td>
                    <td><span class="badge state-open">${match[3].toUpperCase()}</span></td>
                    <td><1ms</td>
                    <td style="color: #555">Verified</td>
                </tr>`;
            resultsBody.innerHTML += row;
        }
    });

    document.getElementById("count-ports").innerText = portCount;
    document.getElementById("count-open").innerText = portCount;
    document.getElementById("bar-ports").style.width = "100%";
    addLog(`Scan finished. ${portCount} ports open.`, "success");
});

document.getElementById("vulnScanBtn").onclick = () => {
    const target = vulnTargetInput.value;
    if (!target || !target.includes('http')) {
        addLog("ERROR: URL must include http:// or https://", "red");
        return;
    }

    vulnResultsBody.innerHTML = ""; 
    addLog(`XSS_ENGINE: Starting injection sequence on ${target}`);
    
    ipcRenderer.send('run-xss-check', target);
};

ipcRenderer.on('xss-result', (event, res) => {
    const statusClass = res.vulnerable ? 'state-open' : '';
    const severityColor = res.vulnerable ? '#ff4b5c' : '#555';
    
    const row = `
        <tr>
            <td style="font-family: monospace; color: #888; font-size: 10px;">${res.payload.replace(/</g, '&lt;')}</td>
            <td>GET</td>
            <td>${res.reflected ? '<span style="color:#ff4b5c">YES</span>' : 'NO'}</td>
            <td><span class="badge ${statusClass}">${res.vulnerable ? 'VULNERABLE' : 'SECURE'}</span></td>
            <td style="color: ${severityColor}; font-weight: bold;">${res.vulnerable ? 'HIGH' : 'LOW'}</td>
        </tr>`;
    
    vulnResultsBody.innerHTML += row;

    if (res.vulnerable) {
        addLog(`CRITICAL: XSS Reflected found with payload: ${res.payload}`, "red");
        // Mise à jour des compteurs de l'interface
        let currentCrit = parseInt(document.getElementById("count-critical").innerText);
        document.getElementById("count-critical").innerText = currentCrit + 1;
        document.getElementById("bar-vuln").style.width = "85%";
    }
});

ipcRenderer.on('error', (event, message) => {
    addLog(`SYSTEM_ERROR: ${message}`, "red");
});