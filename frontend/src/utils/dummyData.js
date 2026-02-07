// Mock data for UnClutter UI. No API, no database.

export const categories = [
  { id: 'university', title: 'University', description: 'McMaster-related emails' },
  { id: 'action', title: 'Action Items', description: 'Tasks and deadlines' },
  { id: 'promotions', title: 'Promotions / FOMO', description: 'Sales and offers' },
  { id: 'unsorted', title: 'Unsorted', description: 'Not yet categorized' },
  { id: 'social', title: 'Social', description: 'Social and newsletters' },
  { id: 'updates', title: 'Updates', description: 'Notifications and updates' },
]

export const emails = [
  // University (6)
  { id: 'u1', sender: 'registrar@mcmaster.ca', subject: 'Avenue to Learn maintenance – Feb 8', snippet: 'Avenue will be offline Sunday 2–6 AM for updates.', date: 'Feb 6', categoryId: 'university', detectedKeywords: ['Avenue', 'Exam'], labels: ['University'], body: 'Avenue to Learn will be unavailable Sunday Feb 8, 2–6 AM. Plan accordingly for exams.', actionItem: false },
  { id: 'u2', sender: 'mosaic@mcmaster.ca', subject: 'Mosaic: Fee deadline reminder', snippet: 'Winter term fees are due by Feb 15 in Mosaic.', date: 'Feb 5', categoryId: 'university', detectedKeywords: ['Mosaic', 'Deadline'], labels: ['University'], body: 'Please pay your winter term fees via Mosaic before Feb 15 to avoid late fees.', actionItem: true },
  { id: 'u3', sender: 'it@mcmaster.ca', subject: 'MacID password reset', snippet: 'Your MacID password expires in 30 days.', date: 'Feb 4', categoryId: 'university', detectedKeywords: ['MacID'], labels: ['University'], body: 'This is a reminder to reset your MacID password before it expires.', actionItem: true },
  { id: 'u4', sender: 'registrar@mcmaster.ca', subject: 'Midterm schedule – Winter 2025', snippet: 'Midterm exam dates are now posted on Avenue.', date: 'Feb 3', categoryId: 'university', detectedKeywords: ['Registrar', 'Midterm', 'Exam'], labels: ['University'], body: 'Your midterm schedule is available. Check Avenue for room and time.', actionItem: false },
  { id: 'u5', sender: 'prof@mcmaster.ca', subject: 'Exam review session', snippet: 'Optional review session Tuesday 4 PM in BSB 147.', date: 'Feb 2', categoryId: 'university', detectedKeywords: ['Exam'], labels: ['University'], body: 'I will hold an optional exam review. Bring your questions.', actionItem: false },
  { id: 'u6', sender: 'registrar@mcmaster.ca', subject: 'Avenue outage follow-up', snippet: 'Avenue is back online. Contact IT if you had issues.', date: 'Feb 1', categoryId: 'university', detectedKeywords: ['Avenue'], labels: ['University'], body: 'The scheduled maintenance is complete. Avenue to Learn is available again.', actionItem: false },
  // Action Items (3)
  { id: 'a1', sender: 'team@work.com', subject: 'Report due Friday', snippet: 'Please submit the Q4 report by EOD Friday.', date: 'Feb 6', categoryId: 'action', detectedKeywords: ['Deadline', 'Due'], labels: ['Action Items'], body: 'The Q4 report is due by end of day Friday. Use the template in the drive.', actionItem: true },
  { id: 'a2', sender: 'boss@company.com', subject: 'Review meeting – action items', snippet: 'Summary of action items from today\'s meeting.', date: 'Feb 5', categoryId: 'action', detectedKeywords: ['Deadline'], labels: ['Action Items'], body: '1. Send draft by Wed. 2. Schedule follow-up by Feb 14. 3. Update the spreadsheet.', actionItem: true },
  { id: 'a3', sender: 'hr@company.com', subject: 'Benefits enrollment deadline', snippet: 'Enroll in benefits by Feb 28.', date: 'Feb 4', categoryId: 'action', detectedKeywords: ['Deadline', 'Due'], labels: ['Action Items'], body: 'Open enrollment ends Feb 28. Log into the portal to choose your plan.', actionItem: true },
  // Promotions (4)
  { id: 'p1', sender: 'store@shop.com', subject: 'Flash Sale – 40% off everything', snippet: 'Use code FLASH40 at checkout. Ends tonight.', date: 'Feb 6', categoryId: 'promotions', detectedKeywords: ['Sale', 'Discount'], labels: ['Promotions'], body: 'Our biggest sale of the year. Use FLASH40 for 40% off. Ends at midnight.', actionItem: false },
  { id: 'p2', sender: 'deals@retail.com', subject: 'Exclusive offer for you', snippet: '20% off your next order. No minimum.', date: 'Feb 5', categoryId: 'promotions', detectedKeywords: ['Offer', 'Discount'], labels: ['Promotions'], body: 'As a valued customer, enjoy 20% off. Click here to redeem.', actionItem: false },
  { id: 'p3', sender: 'newsletter@brand.com', subject: 'Weekend Sale – don\'t miss out', snippet: 'Up to 50% off selected items. Limited time.', date: 'Feb 4', categoryId: 'promotions', detectedKeywords: ['Sale'], labels: ['Promotions'], body: 'Our weekend sale is live. Stock is limited. Shop now.', actionItem: false },
  { id: 'p4', sender: 'promo@site.com', subject: 'Last chance: Free shipping', snippet: 'Free shipping on orders over $50. Today only.', date: 'Feb 3', categoryId: 'promotions', detectedKeywords: ['Offer'], labels: ['Promotions'], body: 'Free shipping on orders over $50. Use code SHIPFREE. Expires tonight.', actionItem: false },
  // Unsorted (4)
  { id: 'x1', sender: 'friend@gmail.com', subject: 'Hey, long time!', snippet: 'We should catch up soon. Coffee next week?', date: 'Feb 7', categoryId: 'unsorted', detectedKeywords: [], labels: ['Unsorted'], body: 'Hey! It\'s been ages. Want to grab coffee next week?', actionItem: false },
  { id: 'x2', sender: 'noreply@random.org', subject: 'Your daily digest', snippet: 'Here are today\'s top stories.', date: 'Feb 6', categoryId: 'unsorted', detectedKeywords: [], labels: ['Unsorted'], body: 'Your personalized digest. Click to read more.', actionItem: false },
  { id: 'x3', sender: 'support@service.com', subject: 'Ticket #4421 updated', snippet: 'Someone replied to your support ticket.', date: 'Feb 5', categoryId: 'unsorted', detectedKeywords: [], labels: ['Unsorted'], body: 'There is a new reply on your ticket. Log in to view it.', actionItem: false },
  { id: 'x4', sender: 'news@blog.com', subject: 'New post: Tips for students', snippet: 'Check out our latest article on study habits.', date: 'Feb 4', categoryId: 'unsorted', detectedKeywords: [], labels: ['Unsorted'], body: 'We published a new post you might like. Read it here.', actionItem: false },
  // Social (2 for variety)
  { id: 's1', sender: 'notifications@linkedin.com', subject: '3 people viewed your profile', snippet: 'See who\'s been checking out your profile.', date: 'Feb 6', categoryId: 'social', detectedKeywords: [], labels: ['Social'], body: 'Your profile was viewed. Upgrade to see who.', actionItem: false },
  { id: 's2', sender: 'twitter@x.com', subject: 'Trending in your network', snippet: 'Here\'s what\'s trending for you today.', date: 'Feb 5', categoryId: 'social', detectedKeywords: [], labels: ['Social'], body: 'Trending topics and accounts we think you\'ll like.', actionItem: false },
  // Updates (2)
  { id: 'up1', sender: 'billing@cloud.com', subject: 'Your invoice is ready', snippet: 'Invoice for January 2025 is available.', date: 'Feb 6', categoryId: 'updates', detectedKeywords: [], labels: ['Updates'], body: 'Your monthly invoice is ready. Log in to download.', actionItem: false },
  { id: 'up2', sender: 'alerts@bank.com', subject: 'Account statement available', snippet: 'Your January statement is ready to view.', date: 'Feb 5', categoryId: 'updates', detectedKeywords: [], labels: ['Updates'], body: 'Your account statement for January is now available in the app.', actionItem: false },
]

// Helper: get emails by category
export function getEmailsByCategory() {
  const byCategory = {}
  categories.forEach((cat) => { byCategory[cat.id] = [] })
  emails.forEach((email) => {
    if (byCategory[email.categoryId]) byCategory[email.categoryId].push(email)
  })
  return byCategory
}

// Helper: get one email by id
export function getEmailById(id) {
  return emails.find((e) => e.id === id) || null
}
