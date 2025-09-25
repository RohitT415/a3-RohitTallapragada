# Personal Finance Tracker
**CS4241 Assignment 3 - Rohit Tallapragada**

**Railway Link:** 

## Express Middleware Packages

I used:

- **express-session:**
- **express.json():** 
- **express.urlencoded():** 
- **express.static():** 
- **checkDatabase (custom):** 

## Technical Achievements

**Key Features:**
- User authentication with automatic account creation
- Expense tracking with multiple categories
- Priority levels and recurring expense flags
- Real-time budget status calculations
- Responsive design using Bootstrap framework

## Challenges Faced

1. **MongoDB Connection Issues:** Encountered SSL/TLS errors when connecting to MongoDB Atlas. Did a workaround by using a fallback to in-memory storage for development.

2. **User Session Management:** Learning to implement proper session handling with Express was a bit confusing and I had trouble underestanding the documentation initially.

3. **Real-time Budget Calculations:** Implementing the derived field calculation that updates budget status based on current category caused me to run into issues with the database initially.

## Authentication Strategy

I am using a simple username/password authentication. I chose this because it seemed the most straightforward to implement and I felt comfortable with my ability to implement it. New accounts are created if a login uses a username that doesn't exist, making it easy for a new to get started. 



## Design/Evaluation Achievements


## CSS Framework

I used Bootstrap 5 as the CSS framework because:
- It provides a comprehensive set of responsive components out of the box
- Well-documented with extensive examples
- Modern design aesthetic without requiring custom design skills
- Grid system makes responsive layout straightforward
- Form styling and validation classes work well with the application's needs

**Custom CSS Modifications:**
- Minimal custom styling in `main.css` to complement Bootstrap
- Custom color scheme adjustments for the success theme
- Added specific styling for budget status cards and borders
- Enhanced footer styling for better visual hierarchy