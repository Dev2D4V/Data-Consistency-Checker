

class ConsistencyCheckerUI {
    constructor() {
        this.apiBase = '/api';
        this.isChecking = false;
        this.currentReport = null;
        
        this.initializeElements();
        this.setupTheme();
        this.attachEventListeners();
        this.loadInitialData();
        this.setupRevealAnimations();
    }

    initializeElements() {

        this.sections = document.querySelectorAll('section, header, footer');

        this.statusIndicator = document.getElementById('status-indicator');
        this.statusText = document.querySelector('.status-text');
        this.lastCheckTime = document.getElementById('last-check-time');
        this.lastConsistentTime = document.getElementById('last-consistent-time');
        this.checkStatus = document.getElementById('check-status');
        this.checkText = document.getElementById('check-text');
        

        this.runCheckBtn = document.getElementById('run-check-btn');
        this.refreshStatusBtn = document.getElementById('refresh-status-btn');
        this.viewReportsBtn = document.getElementById('view-reports-btn');
        

        this.loadingSection = document.getElementById('loading-section');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');
        

        this.latestReportContent = document.getElementById('latest-report-content');
        this.reportsHistorySection = document.getElementById('reports-history-section');
        this.reportsList = document.getElementById('reports-list');
        this.collectionFilter = document.getElementById('collection-filter');
        this.refreshReportsBtn = document.getElementById('refresh-reports-btn');
        

        this.totalChecks = document.getElementById('total-checks');
        this.totalDocuments = document.getElementById('total-documents');
        this.totalInconsistencies = document.getElementById('total-inconsistencies');
        this.totalRepairs = document.getElementById('total-repairs');
        

        this.reportModal = document.getElementById('report-modal');
        this.modalClose = document.getElementById('modal-close');
        this.modalBody = document.getElementById('modal-body');
        

        this.notification = document.getElementById('notification');
        this.notificationIcon = document.getElementById('notification-icon');
        this.notificationMessage = document.getElementById('notification-message');
        

        this.bgVisuals = document.getElementById('bg-visuals');
        this.themeToggle = document.getElementById('theme-toggle');


        this.loginScreen = document.getElementById('login-screen');
        this.loginForm = document.getElementById('login-form');
        this.loginIdInput = document.getElementById('login-id');
        this.dashboardContainer = document.getElementById('dashboard-container');
        

        this.chatbotToggle = document.getElementById('chatbot-toggle');
        this.chatbotWindow = document.getElementById('chatbot-window');
        this.closeChat = document.getElementById('close-chat');
        this.chatInput = document.getElementById('chat-input');
        this.sendChat = document.getElementById('send-chat');
        this.chatMessages = document.getElementById('chat-messages');


        this.userNameTooltip = document.querySelector('.user-name-text');
    }

    attachEventListeners() {
        this.runCheckBtn.addEventListener('click', () => this.runConsistencyCheck());
        this.refreshStatusBtn.addEventListener('click', () => this.loadStatus());
        this.viewReportsBtn.addEventListener('click', () => this.toggleReportsHistory());
        this.refreshReportsBtn.addEventListener('click', () => this.loadReports());
        this.collectionFilter.addEventListener('change', () => this.loadReports());
        this.modalClose.addEventListener('click', () => this.closeModal());
        

        if (this.chatbotToggle) {
            this.chatbotToggle.addEventListener('click', () => this.toggleChatbot());
        }
        if (this.closeChat) {
            this.closeChat.addEventListener('click', () => this.toggleChatbot());
        }
        if (this.sendChat) {
            this.sendChat.addEventListener('click', () => this.sendMessage());
        }
        if (this.chatInput) {
            this.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendMessage();
            });
        }


        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }


        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        

        this.reportModal.addEventListener('click', (e) => {
            if (e.target === this.reportModal) {
                this.closeModal();
            }
        });
        

        setInterval(() => {
            if (!this.isChecking) {
                this.loadStatus();
            }
        }, 30000);
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeIcon(newTheme);
    }

    updateThemeIcon(theme) {
        if (this.themeToggle) {
            const icon = this.themeToggle.querySelector('.btn-icon');
            if (icon) {
                icon.textContent = theme === 'dark' ? '🌙' : '☀️';
            }
        }
    }

    setupRevealAnimations() {
        const options = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {

                    const delay = index * 100;
                    setTimeout(() => {
                        entry.target.classList.add('revealed');
                    }, delay);
                    observer.unobserve(entry.target);
                }
            });
        }, options);

        this.sections.forEach((section) => {
            section.classList.add('reveal-on-scroll');
            observer.observe(section);
        });
    }

    async loadInitialData() {
        await Promise.all([
            this.loadStatus(),
            this.loadLatestReport(),
            this.loadStatistics()
        ]);
    }

    async loadStatus() {
        try {
            const response = await fetch(`${this.apiBase}/status`);
            const data = await response.json();
            
            if (data.success) {
                this.updateStatusDisplay(data.data);
            } else {
                this.showNotification(`Failed to load status: ${data.message}`, 'error');
            }       
        } catch (error) {
            console.error('Error loading status:', error);
            this.showNotification('Error loading status', 'error');
        }
    }

    updateStatusDisplay(status) {
        const statusDot = this.statusIndicator.querySelector('.status-dot');
        const checkIndicator = this.checkStatus.querySelector('.check-indicator');
        

        if (status.isConsistent) {
            statusDot.className = 'status-dot consistent';
            this.statusText.textContent = 'Consistent';
        } else {
            statusDot.className = 'status-dot inconsistent';
            this.statusText.textContent = 'Inconsistent';
        }
        

        if (status.lastCheckTime) {
            this.lastCheckTime.textContent = this.formatDateTime(status.lastCheckTime);
        } else {
            this.lastCheckTime.textContent = 'Never';
        }
        

        if (status.lastConsistentTime) {
            this.lastConsistentTime.textContent = this.formatDateTime(status.lastConsistentTime);
        } else {
            this.lastConsistentTime.textContent = 'Never';
        }
        

        if (status.isActive) {
            checkIndicator.className = 'check-indicator active';
            this.checkText.textContent = 'Check in progress...';
            this.isChecking = true;
            this.runCheckBtn.disabled = true;
            this.showLoadingSection();
        } else {
            checkIndicator.className = 'check-indicator';
            this.checkText.textContent = 'No active check';
            this.isChecking = false;
            this.runCheckBtn.disabled = false;
            this.hideLoadingSection();
        }
    }

    async runConsistencyCheck() {
        if (this.isChecking) return;
        
        this.isChecking = true;
        this.runCheckBtn.disabled = true;
        this.showLoadingSection();
        this.updateProgress(10, 'Starting consistency check...');
        
        try {
            this.updateProgress(25, 'Scanning collection...');
            
            const response = await fetch(`${this.apiBase}/check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ collection: 'users' })
            });
            
            this.updateProgress(75, 'Processing results...');
            
            const data = await response.json();
            
            this.updateProgress(100, 'Complete!');
            
            if (data.success) {
                this.currentReport = data.data;
                this.showNotification('Consistency check completed successfully', 'success');
                

                await Promise.all([
                    this.loadStatus(),
                    this.displayLatestReport(data.data),
                    this.loadStatistics()
                ]);
            } else {
                this.showNotification(`Check failed: ${data.message}`, 'error');
            }
        } catch (error) {
            console.error('Error running consistency check:', error);
            this.showNotification('Error running consistency check', 'error');
        } finally {
            setTimeout(() => {
                this.hideLoadingSection();
                this.isChecking = false;
                this.runCheckBtn.disabled = false;
            }, 1000);
        }
    }

    showLoadingSection() {
        this.loadingSection.classList.remove('hidden');
        this.updateProgress(0, 'Initializing...');
    }

    hideLoadingSection() {
        this.loadingSection.classList.add('hidden');
    }

    updateProgress(percent, text) {
        this.progressFill.style.width = `${percent}%`;
        this.progressText.textContent = text;
    }

    async loadLatestReport() {
        try {
            const response = await fetch(`${this.apiBase}/report/latest`);
            const data = await response.json();
            
            if (data.success && data.data) {
                this.displayLatestReport(data.data);
            } else {
                this.latestReportContent.innerHTML = '<p class="no-data">No reports available. Run a consistency check to generate a report.</p>';
            }
        } catch (error) {
            console.error('Error loading latest report:', error);
            this.latestReportContent.innerHTML = '<p class="no-data">Error loading reports.</p>';
        }
    }

    displayLatestReport(report) {
        if (!report) {
            this.latestReportContent.innerHTML = '<p class="no-data">No reports available.</p>';
            return;
        }
        
        const reportHtml = this.createReportCard(report, true);
        this.latestReportContent.innerHTML = reportHtml;
        

        this.attachReportEventListeners();
    }

    createReportCard(report, isLatest = false) {
        const statusClass = this.getReportStatusClass(report.status);
        const duration = report.durationFormatted || this.formatDuration(report.duration);
        
        return `
            <div class="report-card" data-report-id="${report.id}">
                <div class="report-header">
                    <div class="report-title">
                        ${isLatest ? 'Latest Report' : `Report #${report.id}`}
                        <br><small>${this.formatDateTime(report.timestamp)}</small>
                    </div>
                    <div class="report-status ${statusClass}">${report.status}</div>
                </div>
                
                <div class="report-metrics">
                    <div class="metric">
                        <div class="metric-value">${report.totalDocuments}</div>
                        <div class="metric-label">Total Docs</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${report.inconsistenciesFound}</div>
                        <div class="metric-label">Inconsistencies</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${report.repairsApplied}</div>
                        <div class="metric-label">Repairs</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${report.documentsDeleted}</div>
                        <div class="metric-label">Deleted</div>
                    </div>
                </div>
                
                <div class="report-details">
                    <p><strong>Collection:</strong> ${report.collectionName || 'Default'}</p>
                    <p><strong>Duration:</strong> ${duration}</p>
                    ${report.errors.length > 0 ? `<p><strong>Errors:</strong> ${report.errors.length}</p>` : ''}
                </div>
                
                <div class="report-actions">
                    <button class="btn btn-small view-details-btn" data-report-id="${report.id}">
                        View Details
                    </button>
                    ${!isLatest ? `<button class="btn btn-small delete-report-btn" data-report-id="${report.id}">Delete</button>` : ''}
                </div>
            </div>
        `;
    }

    getReportStatusClass(status) {
        const statusMap = {
            'clean': 'clean',
            'repaired': 'repaired',
            'error': 'error',
            'partial': 'partial'
        };
        return statusMap[status] || 'partial';
    }

    attachReportEventListeners() {

        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reportId = e.target.dataset.reportId;
                this.viewReportDetails(reportId);
            });
        });
        

        document.querySelectorAll('.delete-report-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reportId = e.target.dataset.reportId;
                this.deleteReport(reportId);
            });
        });
    }

    async viewReportDetails(reportId) {
        try {

            let report = null;
            
            if (this.currentReport && this.currentReport.id === reportId) {
                report = this.currentReport;
            } else {
                const response = await fetch(`${this.apiBase}/reports`);
                const data = await response.json();
                if (data.success) {
                    report = data.data.find(r => r.id === reportId);
                }
            }
            
            if (report) {
                this.showReportModal(report);
            } else {
                this.showNotification('Report not found', 'error');
            }
        } catch (error) {
            console.error('Error viewing report details:', error);
            this.showNotification('Error loading report details', 'error');
        }
    }

    showReportModal(report) {
        const detailsHtml = `
            <div class="report-details-full">
                <h4>Report Information</h4>
                <p><strong>ID:</strong> ${report.id}</p>
                <p><strong>Collection:</strong> ${report.collectionName || 'Default'}</p>
                <p><strong>Timestamp:</strong> ${this.formatDateTime(report.timestamp)}</p>
                <p><strong>Duration:</strong> ${report.durationFormatted || this.formatDuration(report.duration)}</p>
                <p><strong>Status:</strong> <span class="report-status ${this.getReportStatusClass(report.status)}">${report.status}</span></p>
                
                <h4>Summary</h4>
                <div class="report-metrics">
                    <div class="metric">
                        <div class="metric-value">${report.totalDocuments}</div>
                        <div class="metric-label">Total Documents</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${report.inconsistenciesFound}</div>
                        <div class="metric-label">Inconsistencies Found</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${report.repairsApplied}</div>
                        <div class="metric-label">Repairs Applied</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${report.documentsDeleted}</div>
                        <div class="metric-label">Documents Deleted</div>
                    </div>
                </div>
                
                ${report.errors.length > 0 ? `
                    <h4>Errors</h4>
                    <ul>
                        ${report.errors.map(error => `<li>${error}</li>`).join('')}
                    </ul>
                ` : ''}
                
                ${report.details && report.details.length > 0 ? `
                    <h4>Repair Details</h4>
                    <div class="details-list">
                        ${report.details.map(detail => `
                            <div class="detail-item">
                                <strong>Document:</strong> ${detail.documentId}<br>
                                <strong>Issue:</strong> ${detail.issue}<br>
                                <strong>Action:</strong> ${detail.action}
                                ${detail.oldValue !== undefined ? `<br><strong>Old Value:</strong> ${detail.oldValue}` : ''}
                                ${detail.newValue !== undefined ? `<br><strong>New Value:</strong> ${detail.newValue}` : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        
        this.modalBody.innerHTML = detailsHtml;
        this.reportModal.classList.remove('hidden');
    }

    closeModal() {
        this.reportModal.classList.add('hidden');
    }

    async toggleReportsHistory() {
        if (this.reportsHistorySection.classList.contains('hidden')) {
            this.reportsHistorySection.classList.remove('hidden');
            await this.loadReports();
            this.viewReportsBtn.textContent = 'Hide Reports';
        } else {
            this.reportsHistorySection.classList.add('hidden');
            this.viewReportsBtn.innerHTML = '<span class="btn-icon">📊</span>View All Reports';
        }
    }

    async loadReports() {
        try {
            const collection = this.collectionFilter.value;
            const url = collection ? `${this.apiBase}/reports?collection=${collection}` : `${this.apiBase}/reports`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                this.displayReports(data.data);
            } else {
                this.showNotification(`Failed to load reports: ${data.message}`, 'error');
            }
        } catch (error) {
            console.error('Error loading reports:', error);
            this.showNotification('Error loading reports', 'error');
        }
    }

    displayReports(reports) {
        if (reports.length === 0) {
            this.reportsList.innerHTML = '<p class="no-data">No reports found.</p>';
            return;
        }
        
        const reportsHtml = reports.map(report => this.createReportCard(report, false)).join('');
        this.reportsList.innerHTML = reportsHtml;
        
        this.attachReportEventListeners();
    }

    async loadStatistics() {
        try {
            const response = await fetch(`${this.apiBase}/stats`);
            const data = await response.json();
            
            if (data.success) {
                console.log(data);

                this.updateStatisticsDisplay(data.data);
            }
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    updateStatisticsDisplay(stats) {
        this.totalChecks.textContent = stats.totalChecks || 0;
        this.totalDocuments.textContent = stats.totalDocuments || 0;
        this.totalInconsistencies.textContent = stats.totalInconsistencies || 0;
        this.totalRepairs.textContent = stats.totalRepairs || 0;
    }


    showNotification(message, type = 'info') {
        const notification = this.notification;
        if (!notification) return;

        this.notificationMessage.textContent = message;
        notification.className = `notification ${type}`;
        

        const icons = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        this.notificationIcon.textContent = icons[type] || icons.info;
        
        notification.classList.remove('hidden');
        notification.style.display = 'flex'; // Ensure it's visible if hidden class is removed
        

        setTimeout(() => {
            notification.classList.add('hidden');
        }, 4000);
    }

    formatDateTime(dateString) {
        if (!dateString) return 'Never';
        
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDuration(ms) {
        if (ms < 1000) {
            return `${ms}ms`;
        } else if (ms < 60000) {
            return `${(ms / 1000).toFixed(2)}s`;
        } else {
            return `${(ms / 60000).toFixed(2)}m`;
        }
    }


    toggleChatbot() {
        if (this.chatbotWindow) {
            this.chatbotWindow.classList.toggle('hidden');
            if (!this.chatbotWindow.classList.contains('hidden')) {
                this.chatInput.focus();
            }
        }
    }

    sendMessage() {
        const text = this.chatInput.value.trim();
        if (!text) return;

        this.appendMessage('user', text);
        this.chatInput.value = '';
        

        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;


        setTimeout(() => {
            const response = this.getBotResponse(text);
            this.appendMessage('bot', response);
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 1000);
    }

    appendMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        msgDiv.textContent = text;
        this.chatMessages.appendChild(msgDiv);
    }

    getBotResponse(text) {
        const query = text.toLowerCase();
        

        const totalChecks = document.getElementById('total-checks')?.textContent || '0';
        const statusText = document.querySelector('.status-text')?.textContent || 'Unknown';
        const lastCheck = document.getElementById('last-check-time')?.textContent || 'Unknown';
        const inconsistencies = document.getElementById('total-inconsistencies')?.textContent || '0';

        if (query.includes('status') || query.includes('how is the system')) {
            return `System status is currently: ${statusText}. The last scan was completed on ${lastCheck}.`;
        }
        
        if (query.includes('inconsistency') || query.includes('errors') || query.includes('total')) {
            return `There have been ${totalChecks} total checks performed, with ${inconsistencies} inconsistencies identified and resolved so far.`;
        }

        if (query.includes('how many checks') || query.includes('total checks')) {
            return `A total of ${totalChecks} consistency checks have been logged in the system.`;
        }

        if (query.includes('repair') || query.includes('fix')) {
            return "Repairs are handled automatically during the scanning process. You can view specific repair actions in the 'Latest Report' section below.";
        }

        if (query.includes('hello') || query.includes('hi')) {
            return "Hello! I'm your Data Consistency Assistant. I can tell you about the system's current consistency status, total checks performed, or help you understand the latest report.";
        }

        if (query.includes('help')) {
            return "Try asking: 'What is the current status?', 'How many checks have been run?', or 'Tell me about the latest report'.";
        }

        return "I'm not exactly sure about that, but I can help with system status, total check counts, and consistency reports. Try asking about 'status' or 'total checks'.";
    }

    handleLogin() {
        const userId = this.loginIdInput.value.trim();
        if (!userId) return;


        if (this.userNameTooltip) {
            this.userNameTooltip.textContent = userId;
        }


        this.loginScreen.style.opacity = '0';
        this.loginScreen.style.transform = 'translateY(20px)';
        this.loginScreen.style.transition = 'all 0.5s var(--transition-timing)';

        setTimeout(() => {
            this.loginScreen.classList.add('hidden');
            this.dashboardContainer.classList.remove('hidden');
            if (this.bgVisuals) this.bgVisuals.classList.remove('hidden');
            
            this.dashboardContainer.style.opacity = '0';
            this.dashboardContainer.style.animation = 'slideUpFade 0.6s var(--transition-timing) forwards';
            
            this.showNotification(`Welcome back, ${userId}!`, 'success');
            

            this.setupRevealAnimations();
        }, 500);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    new ConsistencyCheckerUI();
});
