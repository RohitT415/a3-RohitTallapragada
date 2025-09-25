let expenseData = [];
let isLoggedIn = false;

// Budget limits (matching server-side)
const budgetLimits = {
  "Food": 300,
  "Transportation": 200,
  "Entertainment": 150,
  "Utilities": 250,
  "Shopping": 200,
  "Other": 100
};

// Login function
const login = async function(event) {
  event.preventDefault();
  
  const form = document.querySelector("#login-form");
  const formData = new FormData(form);
  
  const loginData = {
    username: formData.get("username"),
    password: formData.get("password")
  };

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(loginData)
    });

    const result = await response.json();
    const messageDiv = document.querySelector("#login-message");

    if (result.success) {
      messageDiv.textContent = result.message;
      messageDiv.style.color = "#4CAF50";
      
      document.querySelector("#login-section").style.display = "none";
      document.querySelector("#app-section").classList.remove("d-none");
      
      isLoggedIn = true;
      
      // Load user's expense data
      loadExpenseData();
      
      document.querySelector("#date").value = new Date().toISOString().split('T')[0];
    } else {
      messageDiv.textContent = result.message;
      messageDiv.style.color = "#f44336";
    }
  } catch (error) {
    console.error("Login error:", error);
    document.querySelector("#login-message").textContent = "Login failed. Please try again.";
    document.querySelector("#login-message").style.color = "#f44336";
  }
};

// Logout function
const logout = async function() {
  try {
    const response = await fetch("/logout", {
      method: "POST"
    });

    if (response.ok) {
      document.querySelector("#login-section").style.display = "block";
      document.querySelector("#app-section").classList.add("d-none");
      
      isLoggedIn = false;
      expenseData = [];
      
      // Clear forms
      document.querySelector("#login-form").reset();
      document.querySelector("#expense-form").reset();
      document.querySelector("#login-message").textContent = "";
    }
  } catch (error) {
    console.error("Logout error:", error);
  }
};

// Submit form function
const submitExpense = async function(event) {
  event.preventDefault();
  
  const form = document.querySelector("#expense-form");
  const formData = new FormData(form);
  
  const expenseData = {
    action: "add",
    description: formData.get("description"),
    amount: formData.get("amount"),
    category: formData.get("category"),
    date: formData.get("date"),
    priority: formData.get("priority"),
    recurring: formData.get("recurring") === "true"
  };

  try {
    const response = await fetch("/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(expenseData)
    });

    if (response.ok) {
      const updatedData = await response.json();
      updateExpenseDisplay(updatedData);
      form.reset();
      
      document.querySelector("#priority-low").checked = true;
      
      document.querySelector("#date").value = new Date().toISOString().split('T')[0];
    } else {
      console.error("Error submitting expense:", response.statusText);
    }
  } catch (error) {
    console.error("Network error:", error);
  }
};

// Delete expense function
const deleteExpense = async function(index) {
  try {
    const response = await fetch("/submit", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ index: index })
    });

    if (response.ok) {
      const updatedData = await response.json();
      updateExpenseDisplay(updatedData);
    } else {
      console.error("Error deleting expense:", response.statusText);
    }
  } catch (error) {
    console.error("Network error:", error);
  }
};

// Load initial data from server
const loadExpenseData = async function() {
  if (!isLoggedIn) return;
  
  try {
    const response = await fetch("/results");
    if (response.ok) {
      const data = await response.json();
      updateExpenseDisplay(data);
    } else {
      console.error("Error loading data:", response.statusText);
    }
  } catch (error) {
    console.error("Network error:", error);
  }
};

// Update the expense display
const updateExpenseDisplay = function(data) {
  expenseData = data;
  updateExpenseTable();
  updateBudgetSummary();
};

// Update the expense table
const updateExpenseTable = function() {
  const tableBody = document.querySelector("#expense-list");
  tableBody.innerHTML = "";

  expenseData.forEach((expense, index) => {
    const row = document.createElement("tr");
    
    // Format the amount as currency
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(expense.amount);

    // Format the date
    const formattedDate = new Date(expense.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    // Determine status badge class
    let statusClass = "badge bg-success";
    let statusText = expense.budgetStatus;
    
    if (expense.budgetStatus.includes("over")) {
      statusClass = "badge bg-danger";
    } else if (expense.budgetStatus.includes("near")) {
      statusClass = "badge bg-warning text-dark";
    }

    row.innerHTML = `
      <td>${expense.description}</td>
      <td>${formattedAmount}</td>
      <td>${expense.category}</td>
      <td><span class="badge bg-secondary">${expense.priority || 'low'}</span></td>
      <td>${expense.recurring ? 'Yes' : 'No'}</td>
      <td>${formattedDate}</td>
      <td><span class="${statusClass}">${statusText}</span></td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteExpense(${index})">Delete</button></td>
    `;
    
    tableBody.appendChild(row);
  });
};

// Update budget summary
const updateBudgetSummary = function() {
  const summaryContainer = document.querySelector("#budget-summary");
  summaryContainer.innerHTML = "";

  // Calculate spending by category
  const categorySpending = {};
  
  Object.keys(budgetLimits).forEach(category => {
    categorySpending[category] = expenseData
      .filter(expense => expense.category === category)
      .reduce((total, expense) => total + expense.amount, 0);
  });

  // Create budget summary cards
  Object.keys(budgetLimits).forEach(category => {
    const spent = categorySpending[category] || 0;
    const limit = budgetLimits[category];
    const percentage = (spent / limit * 100).toFixed(1);
    
    // Determine card color based on spending
    let cardClass = "border-success";
    if (spent > limit) {
      cardClass = "border-danger";
    } else if (spent > limit * 0.8) {
      cardClass = "border-warning";
    }
    
    const budgetCol = document.createElement("div");
    budgetCol.className = "col-md-4 col-sm-6";
    
    budgetCol.innerHTML = `
      <div class="card ${cardClass} h-100">
        <div class="card-body text-center">
          <h6 class="card-title">${category}</h6>
          <h5 class="text-success">${spent.toFixed(2)}</h5>
          <small class="text-muted">of ${limit.toFixed(2)} (${percentage}%)</small>
        </div>
      </div>
    `;
    
    summaryContainer.appendChild(budgetCol);
  });
};

// Initializing
window.onload = function() {
  // Set up login form 
  const loginForm = document.querySelector("#login-form");
  loginForm.addEventListener("submit", login);
  
  // Set up logout
  const logoutBtn = document.querySelector("#logout-btn");
  logoutBtn.addEventListener("click", logout);
  
  // Set up expense form 
  const expenseForm = document.querySelector("#expense-form");
  expenseForm.addEventListener("submit", submitExpense);
  
  console.log("Personal Finance Tracker loaded successfully!");
};