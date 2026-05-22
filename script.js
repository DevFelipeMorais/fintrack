import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, updateProfile, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

// Configuração real do Firebase
const firebaseConfig = { 
  apiKey: "AIzaSyBXRci31SPjB5RWE9brloLwiMUSIGgRSHU", 
  authDomain: "dashboardfinancas.firebaseapp.com", 
  databaseURL: "https://dashboardfinancas-default-rtdb.firebaseio.com", 
  projectId: "dashboardfinancas", 
  storageBucket: "dashboardfinancas.firebasestorage.app", 
  messagingSenderId: "651304968573", 
  appId: "1:651304968573:web:b2479b371af1fb7d8a6c14", 
  measurementId: "G-GXD1CKJXZB" 
}; 

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// Initialize Lucide Icons
lucide.createIcons();

// Auth Screen Toggle
const loginCard = document.getElementById('loginCard');
const registerCard = document.getElementById('registerCard');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');

if (showRegister) {
    showRegister.onclick = () => {
        loginCard.classList.add('hidden');
        registerCard.classList.remove('hidden');
    };
}

if (showLogin) {
    showLogin.onclick = () => {
        registerCard.classList.add('hidden');
        loginCard.classList.remove('hidden');
    };
}

// Toggle Password Visibility
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const eyeIcon = document.getElementById('eyeIcon');

if (togglePassword && passwordInput && eyeIcon) {
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // Update icon
        eyeIcon.setAttribute('data-lucide', type === 'password' ? 'eye' : 'eye-off');
        lucide.createIcons();
    });
}

// Mobile Sidebar Logic
const sidebar = document.getElementById('sidebar');
const openSidebarBtn = document.getElementById('openSidebar');
const closeSidebarBtn = document.getElementById('closeSidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function toggleSidebar() {
    if (sidebar && sidebarOverlay) {
        const isOpen = !sidebar.classList.contains('-translate-x-full');
        if (isOpen) {
            sidebar.classList.add('-translate-x-full');
            sidebarOverlay.classList.add('hidden');
        } else {
            sidebar.classList.remove('-translate-x-full');
            sidebarOverlay.classList.remove('hidden');
        }
    }
}

if (openSidebarBtn) openSidebarBtn.onclick = toggleSidebar;
if (closeSidebarBtn) closeSidebarBtn.onclick = toggleSidebar;
if (sidebarOverlay) sidebarOverlay.onclick = toggleSidebar;

// Auth Logic
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authScreen = document.getElementById('authScreen');
const mainDashboard = document.getElementById('mainDashboard');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const regErrorMsg = document.getElementById('regErrorMsg');
const logoutBtn = document.getElementById('logoutBtn');
const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');

const defaultCategories = ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Salário', 'Outros'];
const specialCategories = [
    'Eletrorastro', 'Rothbarth', 'Contabilidade', 'Sergio', 'Zé Luiz', 
    'Praiana', 'Araucária', 'Praia', 'Seu Roberto', 'Alimentação', 
    'Moradia', 'Transporte', 'Lazer', 'Salário', 'Outros'
];
let currentUser = null;

// Escutar estado da autenticação
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authScreen.classList.add('hidden');
        mainDashboard.classList.remove('hidden');
        
        // Atualizar nome no dashboard (usando email ou displayName)
        const welcomeMsg = document.querySelector('h2');
        if (welcomeMsg) welcomeMsg.innerText = `Olá, ${user.displayName || user.email.split('@')[0]}! 👋`;
        
        updateCategorySelectors();
        loadUserData(); // Carrega do Firestore
        initCharts();
        updateUI();
        resetNavigation();
    } else {
        currentUser = null;
        authScreen.classList.remove('hidden');
        mainDashboard.classList.add('hidden');
        // Limpar dados locais
        transactions = [];
        initialBalance = 0;
        yearlyArchives = [];
    }
});

if (loginForm) {
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        
        if (loginError) loginError.classList.add('hidden');
        
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const email = emailInput.value;
        const password = passwordInput.value;

        const btn = loginForm.querySelector('button[type="submit"]');
        const originalBtnContent = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Entrando...';
        lucide.createIcons();
        btn.disabled = true;

        try {
            // Configurar para que o login NÃO seja persistente (exige login ao fechar o navegador)
            await setPersistence(auth, browserSessionPersistence);
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error("Erro no login:", error);
            if (loginError) {
                loginError.classList.remove('hidden');
                const errorSpan = loginError.querySelector('span');
                
                // Mensagens amigáveis para erros comuns
                switch (error.code) {
                    case 'auth/user-not-found':
                        errorSpan.innerText = 'Ops! Não encontramos uma conta com este e-mail. ✨';
                        break;
                    case 'auth/wrong-password':
                        errorSpan.innerText = 'Senha incorreta. Vamos tentar de novo? 🔐';
                        break;
                    case 'auth/invalid-email':
                        errorSpan.innerText = 'O formato do e-mail parece estar incorreto. 📧';
                        break;
                    case 'auth/user-disabled':
                        errorSpan.innerText = 'Esta conta foi temporariamente desativada. 🛑';
                        break;
                    case 'auth/too-many-requests':
                        errorSpan.innerText = 'Muitas tentativas. Respire fundo e tente em instantes. ⏳';
                        break;
                    case 'auth/operation-not-allowed':
                        errorSpan.innerText = 'O acesso por e-mail ainda não foi habilitado. ⚙️';
                        break;
                    default:
                        errorSpan.innerText = 'Algo deu errado. Por favor, verifique seus dados. 🧐';
                }
                passwordInput.value = '';
            }
        } finally {
            btn.innerHTML = originalBtnContent;
            btn.disabled = false;
            lucide.createIcons();
        }
    };
}

if (registerForm) {
    registerForm.onsubmit = (e) => {
        e.preventDefault();
        
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const phone = "5541987799620";
        
        const message = `✨ *Nova Solicitação de Assinatura - FinTrack* ✨\n\n👋 Olá! Gostaria de solicitar o meu acesso ao sistema.\n\n👤 *Nome:* ${name}\n📧 *E-mail:* ${email}\n\n🚀 Fico no aguardo para começar a organizar minhas finanças!`;
        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        
        window.open(whatsappUrl, '_blank');
    };
}

if (forgotPasswordBtn) {
    forgotPasswordBtn.onclick = async () => {
        const email = document.getElementById('email').value.trim();
        if (!email) {
            alert('Por favor, digite seu e-mail no campo acima para que possamos ajudar você. 📧');
            return;
        }

        const originalBtnContent = forgotPasswordBtn.innerHTML;
        forgotPasswordBtn.innerHTML = 'Verificando...';
        forgotPasswordBtn.disabled = true;

        try {
            // Verificar se o e-mail existe na coleção 'users' do Firestore
            const q = query(collection(db, "users"), where("email", "==", email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // Usuário encontrado! Redirecionar para WhatsApp
                const phone = "5541987799620";
                const message = `🔐 *Solicitação de Recuperação de Senha - FinTrack* ✨\n\n👋 Olá! Esqueci a minha senha de acesso.\n\n📧 *E-mail cadastrado:* ${email}\n\n🚀 Por favor, poderia me ajudar a recuperar o acesso?`;
                const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
                
                window.open(whatsappUrl, '_blank');
            } else {
                // Usuário não encontrado
                alert('Ops! Não encontramos uma assinatura ativa para este e-mail. ✨ Se você já é assinante, verifique se o e-mail digitado está correto.');
            }
        } catch (error) {
            console.error("Erro ao verificar e-mail:", error);
            alert('Tivemos um problema técnico. Por favor, tente novamente em instantes. ⏳');
        } finally {
            forgotPasswordBtn.innerHTML = originalBtnContent;
            forgotPasswordBtn.disabled = false;
        }
    };
}

if (logoutBtn) {
    logoutBtn.onclick = async () => {
        if (confirm('Deseja realmente sair da conta?')) {
            try {
                await signOut(auth);
            } catch (error) {
                console.error("Erro ao sair:", error);
            }
        }
    };
}

function updateCategorySelectors() {
    const filterCategory = document.getElementById('filterCategory');
    const transactionCategory = document.getElementById('transactionCategory') || document.querySelector('select[name="category"]');
    
    // Categorias personalizadas para usuários específicos
    const premiumEmails = ['felipe.morais1609@gmail.com', 'maziamryba@gmail.com'];
    const specialUserEmail = 'jucelymorays@hotmail.com';
    
    let userCategories = [...defaultCategories];

    if (currentUser) {
        if (premiumEmails.includes(currentUser.email)) {
            userCategories = specialCategories;
        } else if (currentUser.email === specialUserEmail) {
            userCategories = [...defaultCategories, 'Aluguel'];
        }
    }

    if (filterCategory) {
        filterCategory.innerHTML = '<option value="">Todas</option>';
        userCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            filterCategory.appendChild(option);
        });
    }

    if (transactionCategory) {
        transactionCategory.innerHTML = '';
        userCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            transactionCategory.appendChild(option);
        });
    }
}

function resetNavigation() {
    // Resetar navegação para o dashboard
    navLinks.forEach(l => {
        l.classList.remove('active');
        l.classList.add('text-slate-500');
        l.classList.remove('bg-indigo-50');
        if (l.getAttribute('data-page') === 'dashboard') {
            l.classList.add('active');
            l.classList.remove('text-slate-500');
        }
    });
    pages.forEach(p => p.classList.add('hidden'));
    const dashboardPage = document.getElementById('page-dashboard');
    if (dashboardPage) dashboardPage.classList.remove('hidden');
}

// Data Management
let transactions = [];
let initialBalance = 0;
let yearlyArchives = [];
let unsubscribe = null;

async function deleteTransaction(id) {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;
    
    transactions = transactions.filter(t => t.id !== id);
    await saveToFirestore();
    updateUI();
    updateFullTransactionList();
}

function loadUserData() {
    if (!currentUser) return;
    
    // Cancelar assinatura anterior se existir
    if (unsubscribe) unsubscribe();

    const userDocRef = doc(db, "users", currentUser.uid);
    
    // Escutar mudanças em tempo real no Firestore
    unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            transactions = data.transactions || [];
            initialBalance = data.initialBalance || 0;
            yearlyArchives = data.archives || [];
        } else {
            // Documento novo para usuário novo
            transactions = [];
            initialBalance = 0;
            yearlyArchives = [];
            saveToFirestore();
        }
        
        updateUI();
        updateFullTransactionList();
        updateHistoryUI();
        manageYearlyArchive();
    });
}

async function saveToFirestore() {
    if (!currentUser) return;
    try {
        const userDocRef = doc(db, "users", currentUser.uid);
        await setDoc(userDocRef, {
            email: currentUser.email, // Salvar e-mail para busca posterior
            transactions: transactions,
            initialBalance: initialBalance,
            archives: yearlyArchives,
            updatedAt: new Date()
        }, { merge: true });
    } catch (error) {
        console.error("Erro ao salvar no Firestore:", error);
    }
}

function manageYearlyArchive() {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Encontrar o último ano com transações ou o ano atual
    const lastTransactionYear = transactions.length > 0 
        ? Math.max(...transactions.map(t => new Date(t.date + 'T00:00:00').getFullYear()))
        : currentYear;

    // Se o ano atual é maior que o último ano de transações, 
    // significa que viramos o ano e podemos arquivar o ano anterior se houver dados.
    // Para simplificar, vamos verificar se o ano anterior já está arquivado.
    const yearToArchive = currentYear - 1;
    const alreadyArchived = yearlyArchives.some(a => a.year === yearToArchive);
    
    const transactionsFromYearToArchive = transactions.filter(t => 
        new Date(t.date + 'T00:00:00').getFullYear() === yearToArchive
    );

    if (!alreadyArchived && transactionsFromYearToArchive.length > 0) {
        // Calcular estatísticas do ano a ser arquivado
        let inc = 0, exp = 0;
        const cats = {};
        transactionsFromYearToArchive.forEach(t => {
            if (t.type === 'income') inc += t.amount;
            else {
                exp += t.amount;
                cats[t.category] = (cats[t.category] || 0) + t.amount;
            }
        });

        let topCat = '-';
        let topCatVal = 0;
        for (const c in cats) {
            if (cats[c] > topCatVal) {
                topCatVal = cats[c];
                topCat = c;
            }
        }

        const archiveSnapshot = {
            year: yearToArchive,
            totalIncome: inc,
            totalExpenses: exp,
            topCategory: topCat,
            transactionCount: transactionsFromYearToArchive.length
        };

        yearlyArchives.push(archiveSnapshot);
        
        // Manter apenas os últimos 2 anos (apagar o mais antigo)
        yearlyArchives.sort((a, b) => b.year - a.year);
        if (yearlyArchives.length === 2) {
            yearlyArchives = yearlyArchives.slice(0, 2);
        }

        saveToFirestore();
    }
}

// Charts
let cashFlowChart, categoryChart;

function initCharts() {
    // Garantir que os elementos existam antes de criar os gráficos
    const canvasFlow = document.getElementById('cashFlowChart');
    const canvasCat = document.getElementById('categoryChart');
    
    if (!canvasFlow || !canvasCat) return;

    const ctxFlow = canvasFlow.getContext('2d');
    if (cashFlowChart) cashFlowChart.destroy(); // Limpar se já existir

    cashFlowChart = new Chart(ctxFlow, {
        type: 'line',
        data: {
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
            datasets: [{
                label: 'Receitas',
                data: [0, 0, 0, 0, 0, 0],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 4,
                pointBackgroundColor: '#10b981'
            }, {
                label: 'Despesas',
                data: [0, 0, 0, 0, 0, 0],
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 4,
                pointBackgroundColor: '#ef4444'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { position: 'top', align: 'end', labels: { boxWidth: 10, usePointStyle: true } },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return ` ${context.dataset.label}: R$ ${context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                        }
                    }
                }
            },
            scales: { 
                y: { 
                    beginAtZero: true,
                    grid: { color: '#f1f5f9' },
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toLocaleString('pt-BR');
                        }
                    }
                },
                x: { grid: { display: false } }
            }
        }
    });

    const ctxCat = canvasCat.getContext('2d');
    if (categoryChart) categoryChart.destroy(); // Limpar se já existir

    categoryChart = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#94a3b8', '#8b5cf6', '#ec4899'],
                borderWidth: 0,
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { position: 'bottom', labels: { boxWidth: 10, padding: 20 } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1) + '%';
                            return ` ${context.label}: R$ ${value.toLocaleString('pt-BR')} (${percentage})`;
                        }
                    }
                }
            },
            cutout: '75%'
        }
    });
}

function updateUI() {
    const list = document.getElementById('transactionList');
    if (!list) return;

    list.innerHTML = '';

    const currentYear = new Date().getFullYear();
    let totalIncomeCurrentYear = 0;
    let totalExpensesCurrentYear = 0;
    let totalIncomeAllTime = 0;
    let totalExpensesAllTime = 0;
    const categoryTotals = {};
    
    // Monthly aggregation for the chart
    const monthlyStats = {};
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(t => {
        const tDate = new Date(t.date + 'T00:00:00'); // Ensure local date parsing
        const tYear = tDate.getFullYear();
        const monthYearKey = `${tYear}-${String(tDate.getMonth()).padStart(2, '0')}`;
        
        if (!monthlyStats[monthYearKey]) {
            monthlyStats[monthYearKey] = { income: 0, expenses: 0, label: `${monthNames[tDate.getMonth()]}/${String(tYear).slice(-2)}` };
        }

        // Cálculos Globais (para o Saldo Total)
        if (t.type === 'income') {
            totalIncomeAllTime += t.amount;
        } else {
            totalExpensesAllTime += t.amount;
        }

        // Cálculos do Ano Atual (para os Cards de Receita/Despesa/Economia)
        if (tYear === currentYear) {
            if (t.type === 'income') {
                totalIncomeCurrentYear += t.amount;
                monthlyStats[monthYearKey].income += t.amount;
            } else {
                totalExpensesCurrentYear += t.amount;
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
                monthlyStats[monthYearKey].expenses += t.amount;
            }
        }

        // Renderizar na tabela (apenas transações do ano atual para manter limpo, ou todas se preferir)
        // Vamos manter todas na tabela mas ordenadas, para o usuário ver o histórico recente
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0';
        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}">
                        <i data-lucide="${t.type === 'income' ? 'arrow-up-right' : 'arrow-down-left'}" class="w-4 h-4"></i>
                    </div>
                    <div class="flex flex-col">
                        <span class="font-medium text-slate-700">${t.description}</span>
                        ${t.tenant ? `<span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Enquelino: ${t.tenant}</span>` : ''}
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-semibold">${t.category}</span>
            </td>
            <td class="px-6 py-4 text-sm text-slate-500">
                ${tDate.toLocaleDateString('pt-BR')}
            </td>
            <td class="px-6 py-4 text-right font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}">
                ${t.type === 'income' ? '+' : '-'} R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </td>
            <td class="px-6 py-4 text-center">
                <button class="delete-btn p-2 text-slate-400 hover:text-rose-600 transition-colors" data-id="${t.id}">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </td>
        `;
        const deleteBtn = row.querySelector('.delete-btn');
        deleteBtn.onclick = () => deleteTransaction(t.id);
        list.appendChild(row);
    });

    // Saldo Final é cumulativo (Saldo Inicial + Tudo que entrou - Tudo que saiu)
    const finalBalance = initialBalance + (totalIncomeAllTime - totalExpensesAllTime);
    
    // Economia e Taxa são baseadas APENAS no ano atual (conforme solicitado)
    const savingsCurrentYear = totalIncomeCurrentYear - totalExpensesCurrentYear;
    const savingsRate = totalIncomeCurrentYear > 0 ? (savingsCurrentYear / totalIncomeCurrentYear * 100).toFixed(1) : 0;

    const elBalance = document.getElementById('totalBalance');
    const elIncome = document.getElementById('totalIncome');
    const elExpenses = document.getElementById('totalExpenses');
    const elSavings = document.getElementById('totalSavings');
    const elRate = document.getElementById('savingsRate');

    if (elBalance) elBalance.innerText = `R$ ${finalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (elIncome) elIncome.innerText = `R$ ${totalIncomeCurrentYear.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (elExpenses) elExpenses.innerText = `R$ ${totalExpensesCurrentYear.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (elSavings) elSavings.innerText = `R$ ${savingsCurrentYear.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (elRate) elRate.innerText = `${savingsRate}% do total (Ano)`;

    // Update Cash Flow Chart (Mantém os últimos meses com dados)
    if (cashFlowChart) {
        const sortedKeys = Object.keys(monthlyStats).sort();
        const keysToShow = sortedKeys.slice(-6);
        cashFlowChart.data.labels = keysToShow.map(key => monthlyStats[key].label);
        cashFlowChart.data.datasets[0].data = keysToShow.map(key => monthlyStats[key].income);
        cashFlowChart.data.datasets[1].data = keysToShow.map(key => monthlyStats[key].expenses);
        cashFlowChart.update();
    }

    // Update Category Chart (Apenas ano atual)
    if (categoryChart) {
        categoryChart.data.labels = Object.keys(categoryTotals);
        categoryChart.data.datasets[0].data = Object.values(categoryTotals);
        categoryChart.update();
    }

    // Refresh icons in table
    lucide.createIcons();
}

// Modal Logic
const modal = document.getElementById('transactionModal');
const addBtn = document.getElementById('addTransactionBtn');
const addBtnList = document.getElementById('addTransactionBtnList');
const closeBtn = document.getElementById('closeModal');
const form = document.getElementById('transactionForm');

const openModal = () => {
    modal.classList.remove('hidden');
    // Reset tenant field when opening
    const tenantField = document.getElementById('tenantField');
    if (tenantField) tenantField.classList.add('hidden');
};

// Lógica para mostrar campo inquilino quando a categoria for Aluguel
const transactionCategory = document.getElementById('transactionCategory');
const tenantField = document.getElementById('tenantField');

if (transactionCategory && tenantField) {
    transactionCategory.addEventListener('change', (e) => {
        if (e.target.value === 'Aluguel') {
            tenantField.classList.remove('hidden');
        } else {
            tenantField.classList.add('hidden');
        }
    });
}

if (addBtn) {
    addBtn.onclick = () => {
        const dateInput = document.getElementById('transactionDate');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
        openModal();
    };
}
if (addBtnList) {
    addBtnList.onclick = () => {
        const dateInput = document.getElementById('transactionDate');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
        openModal();
    };
}
if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');
window.onclick = (e) => { if (e.target === modal) modal.classList.add('hidden'); };

if (form) {
    form.onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const category = formData.get('category');
        const newTransaction = {
            id: Date.now(),
            description: formData.get('description'),
            amount: parseFloat(formData.get('amount')),
            type: formData.get('type'),
            category: category,
            date: formData.get('date') || new Date().toISOString().split('T')[0]
        };

        // Adicionar inquilino se a categoria for Aluguel
        if (category === 'Aluguel') {
            newTransaction.tenant = formData.get('tenant') || '';
        }

        transactions.push(newTransaction);
        saveToFirestore(); // Salvar dados no Firebase
        updateUI();
        form.reset();
        modal.classList.add('hidden');
    };
}

// Navigation Logic
const navLinks = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page-content');

// Settings Elements
const settingsName = document.getElementById('settingsName');
const settingsEmail = document.getElementById('settingsEmail');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

function updateFullTransactionList() {
    const list = document.getElementById('fullTransactionList');
    if (!list) return;

    const searchTerm = searchInput?.value.toLowerCase() || '';
    const categoryTerm = categoryFilter?.value || '';
    const startDate = startDateFilter?.value ? new Date(startDateFilter.value + 'T00:00:00') : null;
    const endDate = endDateFilter?.value ? new Date(endDateFilter.value + 'T00:00:00') : null;

    const filteredTransactions = transactions.filter(t => {
        const tDate = new Date(t.date + 'T00:00:00');
        
        const matchesSearch = t.description.toLowerCase().includes(searchTerm);
        const matchesCategory = categoryTerm === '' || t.category === categoryTerm;
        const matchesStartDate = !startDate || tDate >= startDate;
        const matchesEndDate = !endDate || tDate <= endDate;

        return matchesSearch && matchesCategory && matchesStartDate && matchesEndDate;
    });

    list.innerHTML = '';
    filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(t => {
        const tDate = new Date(t.date + 'T00:00:00');
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0';
        row.innerHTML = `
            <td class="px-8 py-5">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}">
                        <i data-lucide="${t.type === 'income' ? 'arrow-up-right' : 'arrow-down-left'}" class="w-4 h-4"></i>
                    </div>
                    <div class="flex flex-col">
                        <span class="font-medium text-slate-700">${t.description}</span>
                        ${t.tenant ? `<span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Enquelino: ${t.tenant}</span>` : ''}
                    </div>
                </div>
            </td>
            <td class="px-8 py-5">
                <span class="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-semibold">${t.category}</span>
            </td>
            <td class="px-8 py-5 text-sm text-slate-500">
                ${tDate.toLocaleDateString('pt-BR')}
            </td>
            <td class="px-8 py-5 text-right font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}">
                ${t.type === 'income' ? '+' : '-'} R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </td>
            <td class="px-8 py-5 text-center">
                <button class="delete-btn p-2 text-slate-400 hover:text-rose-600 transition-colors" data-id="${t.id}">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </td>
        `;
        const deleteBtn = row.querySelector('.delete-btn');
        deleteBtn.onclick = () => deleteTransaction(t.id);
        list.appendChild(row);
    });
    lucide.createIcons();
}

// Filter Elements
const searchInput = document.getElementById('searchTransactions');
const categoryFilter = document.getElementById('filterCategory');
const startDateFilter = document.getElementById('filterStartDate');
const endDateFilter = document.getElementById('filterEndDate');

[searchInput, categoryFilter, startDateFilter, endDateFilter].forEach(el => {
    if (el) {
        el.addEventListener('input', () => {
            updateFullTransactionList();
        });
    }
});

navLinks.forEach(link => {
    link.onclick = (e) => {
        e.preventDefault();
        const targetPage = link.getAttribute('data-page');
        
        // Update Nav
        navLinks.forEach(l => {
            l.classList.remove('active');
            l.classList.add('text-slate-500');
            l.classList.remove('bg-indigo-50');
        });
        link.classList.add('active');
        link.classList.remove('text-slate-500');

        // Show Page
        pages.forEach(p => p.classList.add('hidden'));
        const page = document.getElementById(`page-${targetPage}`);
        if (page) page.classList.remove('hidden');

        // Fechar sidebar no mobile após navegar
        if (window.innerWidth < 768) {
            toggleSidebar();
        }
        
        // Special logic for pages
        if (targetPage === 'transactions') {
            updateFullTransactionList();
            updateHistoryUI();
        } else if (targetPage === 'reports') {
            checkAnnualReportDate();
        } else if (targetPage === 'settings') {
            // Preencher campos de configurações
            if (settingsName && currentUser) settingsName.value = currentUser.displayName || '';
            if (settingsEmail && currentUser) settingsEmail.value = currentUser.email || '';
        }
    };
});

if (saveSettingsBtn) {
    saveSettingsBtn.onclick = async () => {
        if (!currentUser) return;
        
        const newName = settingsName.value.trim();
        if (!newName) {
            alert('Por favor, insira um nome válido.');
            return;
        }

        const originalBtnContent = saveSettingsBtn.innerHTML;
        saveSettingsBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Salvando...';
        lucide.createIcons();
        saveSettingsBtn.disabled = true;

        try {
            // Atualizar Perfil no Auth
            await updateProfile(auth.currentUser, { displayName: newName });
            
            // Atualizar no Firestore
            const userDocRef = doc(db, "users", currentUser.uid);
            await setDoc(userDocRef, { 
                displayName: newName,
                updatedAt: new Date()
            }, { merge: true });

            // Atualizar UI local
            const welcomeMsg = document.querySelector('h2');
            if (welcomeMsg) welcomeMsg.innerText = `Olá, ${newName}! 👋`;
            
            alert('Perfil atualizado com sucesso! ✨ Suas alterações já estão salvas na nuvem.');
        } catch (error) {
            console.error("Erro ao salvar configurações:", error);
            alert('Ops! Tivemos um problema ao salvar suas alterações. Que tal tentar novamente? 😕');
        } finally {
            saveSettingsBtn.innerHTML = originalBtnContent;
            saveSettingsBtn.disabled = false;
            lucide.createIcons();
        }
    };
}

function updateHistoryUI() {
    const historyFolders = document.getElementById('historyFolders');
    if (!historyFolders) return;

    historyFolders.innerHTML = '';
    
    if (yearlyArchives.length === 0) {
        historyFolders.innerHTML = `
            <div class="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 opacity-50">
                <i data-lucide="folder-lock" class="w-8 h-8 mb-2"></i>
                <span class="text-xs font-bold uppercase">Vazio</span>
            </div>
            <div class="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 opacity-50">
                <i data-lucide="folder-lock" class="w-8 h-8 mb-2"></i>
                <span class="text-xs font-bold uppercase">Vazio</span>
            </div>
        `;
    } else {
        yearlyArchives.forEach(archive => {
            const folder = document.createElement('div');
            folder.className = 'group flex flex-col items-center justify-center p-6 bg-amber-50 border-2 border-amber-100 rounded-2xl cursor-pointer hover:bg-amber-100 transition-all transform hover:-translate-y-1';
            folder.onclick = () => openArchiveModal(archive);
            folder.innerHTML = `
                <i data-lucide="folder" class="w-10 h-10 text-amber-600 mb-2 group-hover:scale-110 transition-transform"></i>
                <span class="text-sm font-bold text-amber-900">${archive.year}</span>
            `;
            historyFolders.appendChild(folder);
        });

        // Adicionar espaço vazio se houver apenas 1 archive
        if (yearlyArchives.length === 1) {
            const empty = document.createElement('div');
            empty.className = 'flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 opacity-50';
            empty.innerHTML = `
                <i data-lucide="folder-lock" class="w-8 h-8 mb-2"></i>
                <span class="text-xs font-bold uppercase">Vazio</span>
            `;
            historyFolders.appendChild(empty);
        }
    }
    lucide.createIcons();
}

function openArchiveModal(archive) {
    const modal = document.getElementById('archiveModal');
    const title = document.getElementById('archiveYearTitle');
    const details = document.getElementById('archiveDetails');
    
    if (!modal || !title || !details) return;

    title.innerText = archive.year;
    details.innerHTML = `
        <div class="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
            <p class="text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">Total Receitas</p>
            <h4 class="text-xl font-extrabold text-emerald-700">R$ ${archive.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
        </div>
        <div class="p-5 bg-rose-50 rounded-2xl border border-rose-100">
            <p class="text-rose-600 text-xs font-bold uppercase tracking-wider mb-1">Total Despesas</p>
            <h4 class="text-xl font-extrabold text-rose-700">R$ ${archive.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
        </div>
        <div class="p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
            <p class="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">Maior Categoria</p>
            <h4 class="text-xl font-extrabold text-indigo-700">${archive.topCategory}</h4>
        </div>
        <div class="p-5 bg-slate-50 rounded-2xl border border-slate-200">
            <p class="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Nº Transações</p>
            <h4 class="text-xl font-extrabold text-slate-700">${archive.transactionCount}</h4>
        </div>
    `;

    modal.classList.remove('hidden');
}

const closeArchiveBtn = document.getElementById('closeArchiveModal');
if (closeArchiveBtn) closeArchiveBtn.onclick = () => document.getElementById('archiveModal').classList.add('hidden');
window.addEventListener('click', (e) => {
    const modal = document.getElementById('archiveModal');
    if (e.target === modal) modal.classList.add('hidden');
});

function checkAnnualReportDate() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalizar para comparar apenas datas
    const year = today.getFullYear();
    const day = today.getDate();
    const month = today.getMonth() + 1;

    const lockedEl = document.getElementById('annualReportLocked');
    const unlockedEl = document.getElementById('annualReportUnlocked');
    const countdownEl = document.getElementById('daysUntilRelease');

    if (!lockedEl || !unlockedEl) return;

    // Regra de liberação: 29/12 a 13/03
    const isUnlocked = (month === 12 && day >= 29) || 
                       (month === 1 || month === 2) || 
                       (month === 3 && day <= 13);

    if (isUnlocked) {
        calculateAnnualStats();
        unlockedEl.classList.remove('hidden');
        lockedEl.classList.add('hidden');
    } else {
        // Calcular quantos dias faltam para o próximo 29/12
        let releaseDate = new Date(year, 11, 29); // 29 de Dezembro (Mês 11 no JS)
        
        // Se já passou de 29/12 este ano (mas não está no período de jan-mar), 
        // a próxima liberação é no ano que vem
        if (today > releaseDate && !isUnlocked) {
            releaseDate.setFullYear(year + 1);
        }

        const diffTime = releaseDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (countdownEl) countdownEl.innerText = diffDays;
        
        lockedEl.classList.remove('hidden');
        unlockedEl.classList.add('hidden');
    }
}

function calculateAnnualStats() {
    const currentYear = new Date().getFullYear();
    let totalIncome = 0;
    let totalExpenses = 0;
    const monthlyExpenses = Array(12).fill(0);
    const categoryExpenses = {};

    transactions.forEach(t => {
        const tDate = new Date(t.date + 'T00:00:00');
        if (tDate.getFullYear() === currentYear) {
            if (t.type === 'income') {
                totalIncome += t.amount;
            } else {
                totalExpenses += t.amount;
                monthlyExpenses[tDate.getMonth()] += t.amount;
                categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
            }
        }
    });

    // Encontrar mês com maior gasto
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    let maxMonthIndex = 0;
    for (let i = 1; i < 12; i++) {
        if (monthlyExpenses[i] > monthlyExpenses[maxMonthIndex]) {
            maxMonthIndex = i;
        }
    }

    // Encontrar categoria com maior gasto
    let maxCategory = '-';
    let maxCatValue = 0;
    for (const cat in categoryExpenses) {
        if (categoryExpenses[cat] > maxCatValue) {
            maxCatValue = categoryExpenses[cat];
            maxCategory = cat;
        }
    }

    // Atualizar UI
    document.getElementById('annualTotalIncome').innerText = `R$ ${totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    document.getElementById('annualTotalExpenses').innerText = `R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    document.getElementById('annualTopMonth').innerText = monthlyExpenses[maxMonthIndex] > 0 ? monthNames[maxMonthIndex] : '-';
    document.getElementById('annualTopCategory').innerText = maxCategory;
}



// Modal Goal Logic
// Removido logicamente


// Modal Balance Logic
const balanceModal = document.getElementById('balanceModal');
const editBalanceBtn = document.getElementById('editInitialBalance');
const closeBalanceBtn = document.getElementById('closeBalanceModal');
const saveBalanceBtn = document.getElementById('saveInitialBalance');
const initialBalanceInput = document.getElementById('initialBalanceInput');

if (editBalanceBtn) {
    editBalanceBtn.onclick = () => {
        initialBalanceInput.value = initialBalance;
        balanceModal.classList.remove('hidden');
    };
}

if (closeBalanceBtn) closeBalanceBtn.onclick = () => balanceModal.classList.add('hidden');

if (saveBalanceBtn) {
    saveBalanceBtn.onclick = () => {
        const val = initialBalanceInput.value === '' ? 0 : parseFloat(initialBalanceInput.value);
        if (!isNaN(val)) {
            initialBalance = val;
            saveToFirestore(); // Salvar dados no Firebase
            updateUI();
            balanceModal.classList.add('hidden');
            console.log('Saldo inicial atualizado para:', initialBalance);
        } else {
            alert('Por favor, insira um valor numérico válido.');
        }
    };
}

// Não inicializar gráficos e UI imediatamente para evitar erros antes do login
// A inicialização agora ocorre dentro da função loginForm.onsubmit
