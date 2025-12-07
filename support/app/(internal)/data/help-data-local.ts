export interface Article {
  id: string
  title: string
  content: string
  categoryId: string
}

export interface Category {
  id: string
  title: string
  description: string
  icon: string
  articles: Article[]
}

export const helpData: Category[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Learn the basics and get up and running quickly",
    icon: "Rocket",
    articles: [
      {
        id: "welcome-guide",
        title: "Welcome to Our Platform",
        categoryId: "getting-started",
        content: `
# Welcome to Our Platform

Welcome! We're excited to have you here. This guide will help you get started with our platform and make the most of all the features available to you.

## What You'll Learn

In this guide, you'll discover:
- How to set up your account
- Key features and how to use them
- Best practices for getting started
- Common questions answered

## Setting Up Your Account

Getting started is easy. Follow these simple steps:

1. **Create Your Profile**: Add your basic information and preferences
2. **Customize Your Settings**: Adjust settings to match your workflow
3. **Explore Features**: Take a tour of the main features
4. **Connect Your Tools**: Integrate with your existing workflow

## Key Features Overview

Our platform offers a comprehensive set of tools designed to streamline your work:

### Dashboard
Your central hub for all activities. Monitor progress, view updates, and access quick actions.

### Projects
Organize your work into projects. Create, manage, and collaborate with your team.

### Analytics
Track your progress with detailed analytics and insights.

## Best Practices

To get the most out of our platform:
- Complete your profile information
- Set up notifications according to your preferences
- Explore the integrations available
- Join our community for tips and support

## Need Help?

If you need assistance at any time:
- Browse our help articles
- Contact our support team
- Join our community forum
- Check out video tutorials

We're here to help you succeed!
        `,
      },
      {
        id: "account-setup",
        title: "Setting Up Your Account",
        categoryId: "getting-started",
        content: `
# Setting Up Your Account

This guide walks you through the complete account setup process to ensure you're ready to use all features.

## Initial Setup Steps

### 1. Personal Information
Add your personal details to complete your profile:
- Full name
- Email address
- Phone number (optional)
- Profile picture

### 2. Security Settings
Protect your account with strong security:
- Create a strong password
- Enable two-factor authentication
- Set up security questions
- Review connected devices

### 3. Preferences
Customize your experience:
- Language preferences
- Time zone settings
- Notification preferences
- Display options

## Privacy Settings

Control what information is visible:
- Profile visibility
- Activity sharing
- Data collection preferences
- Marketing communications

## Verification

Some features require account verification:
1. Check your email for verification link
2. Click the verification link
3. Confirm your identity
4. Start using verified features

## Troubleshooting

If you encounter issues during setup:
- Clear your browser cache
- Use a supported browser
- Check your internet connection
- Contact support if problems persist
        `,
      },
      {
        id: "navigation-basics",
        title: "Navigation Basics",
        categoryId: "getting-started",
        content: `
# Navigation Basics

Learn how to navigate efficiently through our platform and find what you need quickly.

## Main Navigation

The main navigation bar provides access to key areas:
- **Dashboard**: Your home base
- **Projects**: View and manage all projects
- **Messages**: Communication center
- **Settings**: Account and app preferences

## Search Functionality

Use the search bar to quickly find:
- Articles and documentation
- Projects and files
- Users and teams
- Settings and features

## Keyboard Shortcuts

Speed up your workflow with these shortcuts:
- \`Ctrl/Cmd + K\`: Quick search
- \`Ctrl/Cmd + N\`: New project
- \`Ctrl/Cmd + /\`: Show all shortcuts
- \`Esc\`: Close modal or dialog

## Mobile Navigation

On mobile devices:
- Tap the menu icon to access navigation
- Swipe between screens
- Use the bottom navigation bar
- Access quick actions via long press

## Tips for Efficient Navigation

- Bookmark frequently used pages
- Use browser history and favorites
- Set up custom shortcuts
- Organize your workspace
        `,
      },
    ],
  },
  {
    id: "account-management",
    title: "Account Management",
    description: "Manage your account settings, billing, and preferences",
    icon: "User",
    articles: [
      {
        id: "profile-settings",
        title: "Managing Your Profile",
        categoryId: "account-management",
        content: `
# Managing Your Profile

Your profile is your identity on our platform. Keep it updated and professional.

## Profile Information

### Basic Details
Update your core information:
- **Name**: Your display name
- **Email**: Primary contact email
- **Phone**: Optional contact number
- **Bio**: Brief description about yourself

### Profile Picture
Add a professional photo:
1. Click on your current profile picture
2. Select "Upload new photo"
3. Choose an image (max 5MB)
4. Crop and adjust as needed
5. Save your changes

## Professional Information

Add details about your work:
- Job title
- Company name
- Department
- Location
- Website or portfolio

## Privacy Controls

Choose what others can see:
- **Public**: Visible to everyone
- **Team**: Visible to team members only
- **Private**: Visible only to you

## Social Connections

Link your social profiles:
- LinkedIn
- Twitter
- GitHub
- Professional website

## Notification Preferences

Control how you receive notifications:
- Email notifications
- In-app alerts
- Mobile push notifications
- SMS alerts (if enabled)

## Updating Your Information

Changes take effect immediately:
1. Navigate to Settings > Profile
2. Click Edit on any section
3. Make your changes
4. Click Save

Your profile helps others understand who you are and how to work with you effectively.
        `,
      },
      {
        id: "security-privacy",
        title: "Security and Privacy",
        categoryId: "account-management",
        content: `
# Security and Privacy

Protecting your account and data is our top priority. Learn how to keep your account secure.

## Account Security

### Strong Passwords
Create a secure password:
- Minimum 12 characters
- Mix of letters, numbers, and symbols
- Avoid common words or patterns
- Never share your password

### Two-Factor Authentication (2FA)
Add an extra layer of security:
1. Go to Security Settings
2. Enable Two-Factor Authentication
3. Choose your method (SMS or app)
4. Scan QR code or enter code
5. Save backup codes securely

### Session Management
Monitor active sessions:
- View all logged-in devices
- Review login locations and times
- Sign out from specific devices
- Sign out from all devices remotely

## Privacy Settings

### Data Collection
Control what data we collect:
- Usage analytics
- Performance data
- Feature usage statistics
- Diagnostic information

### Third-Party Access
Manage connected applications:
- Review authorized apps
- Revoke access when needed
- Monitor data sharing
- Set access permissions

### Communication Preferences
Choose how we contact you:
- Product updates
- Marketing emails
- Survey invitations
- Newsletter subscription

## Data Protection

Your data is protected through:
- Encryption at rest and in transit
- Regular security audits
- Compliance with data protection regulations
- Secure backup systems

## Reporting Security Issues

If you notice suspicious activity:
1. Change your password immediately
2. Review recent account activity
3. Contact our security team
4. Enable 2FA if not already active

## Best Practices

- Review security settings regularly
- Update password every 90 days
- Be cautious of phishing attempts
- Don't share account credentials
- Use unique passwords for each service
        `,
      },
    ],
  },
  {
    id: "features",
    title: "Features & Tools",
    description: "Explore powerful features and learn how to use them",
    icon: "Zap",
    articles: [
      {
        id: "dashboard-overview",
        title: "Dashboard Overview",
        categoryId: "features",
        content: `
# Dashboard Overview

Your dashboard is the command center for all your activities. Let's explore what's available.

## Dashboard Layout

The dashboard is organized into several key sections:

### Quick Actions
Access frequently used functions instantly:
- Create new project
- Send message
- Upload file
- Schedule meeting

### Activity Feed
Stay updated with real-time information:
- Recent updates
- Team activity
- Notifications
- System alerts

### Statistics & Metrics
Monitor your key performance indicators:
- Active projects
- Completion rates
- Team productivity
- Resource utilization

## Customization

### Widgets
Add, remove, or rearrange widgets:
1. Click "Customize Dashboard"
2. Select widgets to add
3. Drag to reposition
4. Click Save Layout

### Display Options
Personalize your view:
- Light or dark theme
- Compact or comfortable spacing
- Grid or list view
- Show/hide sections

## Dashboard Features

### Search Bar
Quickly find anything:
- Type to search across all content
- Use filters to narrow results
- Recent searches saved
- Suggested results appear instantly

### Quick Filters
Filter dashboard data:
- By date range
- By project or team
- By status or priority
- By assigned user

### Export Options
Download your data:
- Export to CSV
- Generate PDF reports
- Schedule automated reports
- Share with team members

## Tips for Maximum Productivity

- Pin important items to the top
- Set up custom views for different workflows
- Use keyboard shortcuts for quick actions
- Review your dashboard daily for updates
        `,
      },
      {
        id: "collaboration-tools",
        title: "Collaboration Tools",
        categoryId: "features",
        content: `
# Collaboration Tools

Work together seamlessly with powerful collaboration features designed for teams.

## Real-Time Collaboration

### Shared Workspaces
Create and manage shared spaces:
- Invite team members
- Set access permissions
- Share files and resources
- Track changes in real-time

### Live Editing
Collaborate on documents simultaneously:
- See who's editing in real-time
- Track cursor positions
- Comment and suggest changes
- Auto-save prevents data loss

### Comments & Mentions
Communicate within context:
- Add comments anywhere
- @mention team members for notifications
- Reply to threads
- Mark comments as resolved

## Team Communication

### Integrated Messaging
Stay connected:
- Direct messages
- Group chats
- Channel-based communication
- File sharing in conversations

### Video Conferencing
Face-to-face meetings made easy:
- One-click video calls
- Screen sharing
- Recording capabilities
- Calendar integration

### Notifications
Never miss important updates:
- Customizable alerts
- Smart notification grouping
- Do not disturb mode
- Digest emails

## Project Collaboration

### Task Assignment
Distribute work efficiently:
- Assign tasks to team members
- Set deadlines and priorities
- Track progress
- Send reminders

### File Collaboration
Work on files together:
- Version control
- Change tracking
- Comment on specific sections
- Approval workflows

### Shared Calendars
Coordinate schedules:
- Team availability
- Meeting scheduling
- Event reminders
- Time zone support

## Best Practices

- Establish communication guidelines
- Use @mentions purposefully
- Keep discussions focused
- Archive completed projects
- Regular team check-ins
        `,
      },
      {
        id: "advanced-features",
        title: "Advanced Features",
        categoryId: "features",
        content: `
# Advanced Features

Unlock the full potential of our platform with these advanced capabilities.

## Automation

### Workflow Automation
Streamline repetitive tasks:
- Set up trigger-action workflows
- Automate notifications
- Schedule recurring tasks
- Integrate with external tools

### Templates
Save time with reusable templates:
- Project templates
- Document templates
- Email templates
- Workflow templates

### Batch Operations
Perform actions at scale:
- Bulk edit items
- Mass assign tasks
- Batch delete or archive
- Export multiple items

## Integrations

### Third-Party Apps
Connect your favorite tools:
- Cloud storage (Google Drive, Dropbox)
- Communication (Slack, Teams)
- CRM systems
- Development tools

### API Access
Build custom integrations:
- RESTful API endpoints
- Webhooks for real-time updates
- Authentication methods
- Rate limits and best practices

### Data Import/Export
Move data in and out:
- Import from CSV, Excel, JSON
- Export to multiple formats
- Scheduled exports
- Data migration tools

## Advanced Analytics

### Custom Reports
Create detailed insights:
- Build custom dashboards
- Choose metrics and dimensions
- Schedule report delivery
- Share with stakeholders

### Data Visualization
Understand data at a glance:
- Charts and graphs
- Trend analysis
- Comparative views
- Interactive visualizations

### Performance Metrics
Track what matters:
- User productivity
- Project timelines
- Resource allocation
- ROI calculations

## Power User Tips

- Learn keyboard shortcuts
- Create custom workflows
- Use advanced search operators
- Set up automated backups
- Leverage API for custom solutions

## Getting Help with Advanced Features

- Check API documentation
- Join developer community
- Watch tutorial videos
- Contact enterprise support
        `,
      },
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    description: "Find solutions to common issues and technical problems",
    icon: "AlertCircle",
    articles: [
      {
        id: "common-issues",
        title: "Common Issues and Solutions",
        categoryId: "troubleshooting",
        content: `
# Common Issues and Solutions

Quick fixes for the most frequently encountered problems.

## Login Issues

### Can't Log In
If you're having trouble accessing your account:
1. Verify your email and password are correct
2. Check if Caps Lock is on
3. Clear browser cookies and cache
4. Try a different browser
5. Use the "Forgot Password" option

### Account Locked
Account locked after multiple failed attempts:
- Wait 30 minutes for automatic unlock
- Use password reset to unlock immediately
- Contact support for immediate assistance

## Loading Problems

### Page Not Loading
If pages are slow or not loading:
1. Check your internet connection
2. Refresh the page (F5 or Cmd+R)
3. Clear browser cache
4. Disable browser extensions
5. Try incognito/private mode

### Slow Performance
Speed up your experience:
- Close unnecessary browser tabs
- Clear browser cache and cookies
- Update your browser to latest version
- Check system resources (RAM, CPU)
- Disable heavy browser extensions

## File Upload Issues

### Can't Upload Files
Troubleshoot upload problems:
- Check file size (max 100MB per file)
- Verify file type is supported
- Ensure stable internet connection
- Try a different browser
- Disable VPN temporarily

### Upload Fails Midway
If uploads keep failing:
1. Use a wired connection instead of WiFi
2. Upload smaller batches
3. Compress large files
4. Check available storage space
5. Contact support for large transfers

## Display Issues

### Layout Broken
Fix display problems:
- Force refresh (Ctrl+Shift+R)
- Clear cache and cookies
- Update browser to latest version
- Check zoom level (should be 100%)
- Try different browser

### Missing Features
If you can't see certain features:
- Verify your account permissions
- Check if feature is enabled for your plan
- Clear browser cache
- Log out and log back in
- Contact admin to verify access

## Notification Problems

### Not Receiving Notifications
Ensure you get important alerts:
1. Check notification settings
2. Verify email address is correct
3. Check spam/junk folder
4. Whitelist our email domain
5. Test with a sample notification

## Getting More Help

If these solutions don't resolve your issue:
- Contact support with detailed information
- Include screenshots if possible
- Note any error messages
- Describe steps to reproduce the problem
        `,
      },
      {
        id: "error-messages",
        title: "Understanding Error Messages",
        categoryId: "troubleshooting",
        content: `
# Understanding Error Messages

Learn what error messages mean and how to resolve them.

## Authentication Errors

### "Invalid Credentials"
Your login information is incorrect:
- Double-check email and password
- Ensure no extra spaces
- Try password reset
- Check if account exists

### "Session Expired"
Your login session has timed out:
- Log in again
- Enable "Remember Me" for longer sessions
- Check if cookies are enabled
- Verify system time is correct

### "Access Denied"
You don't have permission:
- Verify you have the right account
- Contact your administrator
- Check if account is active
- Ensure feature is available in your plan

## File Errors

### "File Too Large"
Your file exceeds size limits:
- Maximum single file size: 100MB
- Compress file before uploading
- Split into smaller files
- Contact support for large file transfer

### "Unsupported File Type"
File format not accepted:
- Check supported formats list
- Convert file to supported format
- Rename extension if incorrect
- Try zipping the file

### "Upload Failed"
Could not complete upload:
- Check internet connection
- Verify available storage space
- Try again in a few moments
- Use different browser

## System Errors

### "Server Error (500)"
Temporary server problem:
- Wait a few minutes and retry
- Clear browser cache
- Check status page
- Report if problem persists

### "Page Not Found (404)"
The page doesn't exist:
- Check URL for typos
- Use search to find correct page
- Return to homepage
- Contact support if link is broken

### "Network Error"
Connection problem:
- Check internet connection
- Disable VPN temporarily
- Try different network
- Check firewall settings

## Data Errors

### "Validation Error"
Form data is incorrect:
- Review highlighted fields
- Follow format requirements
- Remove special characters
- Ensure required fields are filled

### "Duplicate Entry"
Item already exists:
- Check existing items
- Use different name or identifier
- Update existing item instead
- Archive old duplicate first

## Payment Errors

### "Payment Failed"
Transaction could not be processed:
- Verify card details
- Check card balance
- Ensure card is not expired
- Try different payment method
- Contact your bank

## Next Steps

If errors continue:
1. Take screenshot of error
2. Note what you were doing
3. Try in incognito mode
4. Contact support with details
        `,
      },
    ],
  },
  {
    id: "billing",
    title: "Billing & Subscriptions",
    description: "Manage your subscription, payments, and invoices",
    icon: "CreditCard",
    articles: [
      {
        id: "subscription-plans",
        title: "Subscription Plans",
        categoryId: "billing",
        content: `
# Subscription Plans

Choose the right plan for your needs and learn how to manage your subscription.

## Available Plans

### Free Plan
Perfect for getting started:
- 5 projects
- 1GB storage
- Basic features
- Community support
- Single user

### Professional Plan
For individuals and small teams:
- Unlimited projects
- 100GB storage
- Advanced features
- Priority support
- Up to 5 users
- **$29/month**

### Business Plan
For growing organizations:
- Unlimited everything
- 1TB storage
- Premium features
- Dedicated support
- Unlimited users
- Advanced integrations
- **$99/month**

### Enterprise Plan
For large organizations:
- Custom solutions
- Unlimited storage
- All features
- 24/7 support
- Unlimited users
- Custom integrations
- SLA guarantees
- **Contact sales**

## Plan Comparison

| Feature | Free | Professional | Business | Enterprise |
|---------|------|--------------|----------|------------|
| Projects | 5 | Unlimited | Unlimited | Unlimited |
| Storage | 1GB | 100GB | 1TB | Unlimited |
| Users | 1 | 5 | Unlimited | Unlimited |
| Support | Community | Priority | Dedicated | 24/7 |
| API Access | No | Yes | Yes | Yes |
| Custom Branding | No | No | Yes | Yes |

## Upgrading Your Plan

Ready to unlock more features?
1. Go to Settings > Billing
2. Click "Upgrade Plan"
3. Select desired plan
4. Enter payment details
5. Confirm upgrade

Changes take effect immediately, and you'll only be charged the prorated difference.

## Downgrading Your Plan

Need to reduce costs?
1. Navigate to Billing Settings
2. Select "Change Plan"
3. Choose lower tier
4. Review what you'll lose
5. Confirm downgrade

Downgrades take effect at the end of your current billing period.

## Annual Billing

Save 20% with annual payment:
- Pay once per year
- Immediate cost savings
- Lock in current pricing
- Priority support

## Free Trial

Try premium features risk-free:
- 14-day free trial
- No credit card required
- Full feature access
- Cancel anytime

## Questions?

- Compare plans side by side
- Calculate costs for your team
- Contact sales for custom needs
- Check our FAQ for common questions
        `,
      },
      {
        id: "payment-methods",
        title: "Payment Methods",
        categoryId: "billing",
        content: `
# Payment Methods

Manage how you pay for your subscription and handle payment issues.

## Accepted Payment Methods

We accept:
- **Credit Cards**: Visa, Mastercard, American Express, Discover
- **Debit Cards**: Major debit cards with card networks
- **PayPal**: Link your PayPal account
- **Bank Transfer**: Available for annual plans (Enterprise only)
- **Purchase Orders**: Enterprise customers only

## Adding a Payment Method

Set up your payment:
1. Go to Settings > Billing
2. Click "Payment Methods"
3. Select "Add Payment Method"
4. Enter payment details
5. Click "Save"

Your information is encrypted and secure.

## Updating Payment Information

Change your payment details:
1. Navigate to Billing Settings
2. Select existing payment method
3. Click "Edit" or "Update"
4. Enter new information
5. Save changes

## Setting Default Payment Method

If you have multiple payment methods:
1. Go to Payment Methods
2. Find the method you want to use
3. Click "Set as Default"
4. Confirm your choice

Your default method will be used for automatic renewals.

## Removing Payment Methods

Delete unused payment methods:
1. View all payment methods
2. Select method to remove
3. Click "Remove"
4. Confirm deletion

You cannot remove your only payment method if you have an active subscription.

## Payment Security

Your security is our priority:
- PCI DSS compliant processing
- End-to-end encryption
- No storage of sensitive data
- Secure payment gateway
- Fraud detection systems

## Failed Payments

If a payment fails:
1. You'll receive an email notification
2. We'll retry in 3 days
3. Second retry after 7 days
4. Account may be suspended after 14 days

Update your payment method immediately to avoid service interruption.

## Refund Policy

Understanding refunds:
- 30-day money-back guarantee
- Prorated refunds for downgrades
- No refunds for partial months
- Contact support to request refund

## Payment History

View all transactions:
- Go to Billing > Payment History
- See all charges and dates
- Download receipts
- Filter by date range

## Questions?

Contact our billing team:
- Email: billing@example.com
- Phone: 1-800-XXX-XXXX
- Live chat during business hours
        `,
      },
      {
        id: "invoices-receipts",
        title: "Invoices and Receipts",
        categoryId: "billing",
        content: `
# Invoices and Receipts

Access, download, and manage your billing documents.

## Viewing Invoices

Access your invoices:
1. Go to Settings > Billing
2. Click "Invoices" tab
3. Browse all invoices by date
4. Click any invoice to view details

## Downloading Invoices

Get PDF copies:
1. Open invoice details
2. Click "Download PDF"
3. Save to your device
4. Use for accounting or reimbursement

## Invoice Information

Each invoice includes:
- Invoice number
- Billing date
- Payment method
- Amount charged
- Tax information
- Billing address
- Itemized charges
- Company information

## Email Receipts

Automatic receipts sent via email:
- Sent immediately after payment
- Includes transaction details
- PDF attachment included
- Check spam folder if missing

## Updating Billing Information

Change what appears on invoices:
1. Go to Billing Settings
2. Click "Billing Information"
3. Update company name
4. Add tax ID or VAT number
5. Update billing address
6. Save changes

Future invoices will reflect these changes.

## Past Invoices

Access historical records:
- View invoices from past 7 years
- Filter by date range
- Sort by amount or date
- Bulk download multiple invoices

## Invoice Discrepancies

If you notice an error:
1. Note the invoice number
2. Identify the specific issue
3. Contact billing support
4. Provide supporting documentation
5. We'll review and issue correction

## Tax Exempt Status

For tax-exempt organizations:
1. Contact billing support
2. Provide tax exemption certificate
3. Verify organization status
4. We'll update your account
5. Future invoices won't include tax

## Custom Invoicing

Enterprise customers can request:
- Custom purchase orders
- Net-30 or Net-60 terms
- Multiple billing contacts
- Departmental billing
- Custom invoice format

Contact your account manager to set up.

## Billing Cycle

Understanding your billing:
- Charged at start of billing period
- Monthly or annual options
- Prorated charges for upgrades
- Credits for downgrades

## Export for Accounting

Integrate with accounting systems:
- Export to CSV
- Download all invoices as ZIP
- API access to billing data
- Automatic sync available

## Need Help?

Our billing team is here to assist:
- Email billing questions
- Request specific documentation
- Clarify charges
- Update billing information
        `,
      },
    ],
  },
]

export const getArticleById = (articleId: string): Article | undefined => {
  for (const category of helpData) {
    const article = category.articles.find((a) => a.id === articleId)
    if (article) return article
  }
  return undefined
}

export const getCategoryById = (categoryId: string): Category | undefined => {
  return helpData.find((c) => c.id === categoryId)
}

export const getArticlesByCategory = (categoryId: string): Article[] => {
  const category = getCategoryById(categoryId)
  return category?.articles || []
}
