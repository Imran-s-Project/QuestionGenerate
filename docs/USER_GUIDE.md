# User guide / ব্যবহার নির্দেশিকা

This file is generated from `js/utilities/guide.js`, the same text as the in-app Help page.

## English

### 1. Getting started

Create an account, then create your institution on the Institutions page. Use the menu to switch institutions. Invite colleagues from Users & Roles: create a one-time code and send it privately; they paste it under "Join with an invite code".

### 2. Roles

Owner and Admin manage everything. Teacher and Editor create questions and answer keys. Reviewer reads questions and answer keys. Exam manager builds exams, papers and layouts. Viewer can read questions and exams but never answer keys.

### 3. Questions

Open Question Builder, choose a type, write the question (toolbar: bold, italic, underline, superscript, subscript, fractions, lists, tables, symbols) and fill the answer. Answers are saved separately from the question. Similar questions trigger a warning. Find questions in the Question Bank by search or one filter.

### 4. Exams

Create an exam in Exam Manager. Add sections with a question count and marks each; totals are calculated and any mismatch is shown. An exam can only be marked final when everything is consistent.

### 5. Papers

In the Paper Generator pick questions by hand or auto-fill, then generate sets A to F with shuffled questions and options. Open Paper Preview to design the layout, preview the pages and print. Choose "Save as PDF" in the print dialog for a PDF.

### 6. Import and export

Import questions from CSV, XLSX, JSON or pasted text: check the preview, fix problems, then import. Export papers, answer keys, solutions, the question bank or a full exam archive from the Export Center.

### 7. Backup

Create a backup file regularly from Backup & Restore. Restoring adds new copies and never deletes or overwrites existing data.

### 8. Offline and problems

The app works offline with data it has already loaded and syncs when you are back online. If a filter says it needs an index, run "firebase deploy" and wait a few minutes. The first paper preview needs internet to load Bengali fonts.

## বাংলা

### ১. শুরু করা

অ্যাকাউন্ট খুলে প্রতিষ্ঠান পাতায় নিজের প্রতিষ্ঠান তৈরি করুন। মেনু থেকে প্রতিষ্ঠান বদলান। সহকর্মীদের ব্যবহারকারী ও ভূমিকা পাতা থেকে একবারের কোড বানিয়ে গোপনে পাঠান; তারা "ইনভাইট কোড দিয়ে যোগ দিন" অংশে কোডটি দেবেন।

### ২. ভূমিকা

মালিক ও অ্যাডমিন সবকিছু পরিচালনা করেন। শিক্ষক ও প্রশ্ন সম্পাদক প্রশ্ন ও উত্তরমালা বানান। পর্যালোচক প্রশ্ন ও উত্তরমালা পড়েন। পরীক্ষা ব্যবস্থাপক পরীক্ষা, প্রশ্নপত্র ও লেআউট তৈরি করেন। দর্শক প্রশ্ন ও পরীক্ষা দেখতে পারেন, উত্তরমালা নয়।

### ৩. প্রশ্ন

প্রশ্ন নির্মাতায় ধরন বেছে প্রশ্ন লিখুন (টুলবারে বোল্ড, ইটালিক, আন্ডারলাইন, সুপারস্ক্রিপ্ট, সাবস্ক্রিপ্ট, ভগ্নাংশ, তালিকা, টেবিল, চিহ্ন) এবং উত্তর দিন। উত্তর আলাদাভাবে সংরক্ষিত হয়। একই রকম প্রশ্ন থাকলে সতর্কতা আসে। প্রশ্নব্যাংকে সার্চ বা একটি ফিল্টার দিয়ে প্রশ্ন খুঁজুন।

### ৪. পরীক্ষা

পরীক্ষা ব্যবস্থাপনায় পরীক্ষা তৈরি করুন। প্রশ্নসংখ্যা ও প্রতিটির নম্বর দিয়ে সেকশন যোগ করুন; মোট নম্বর নিজে হিসাব হয় এবং গরমিল দেখানো হয়। সবকিছু মিললে তবেই পরীক্ষা চূড়ান্ত করা যায়।

### ৫. প্রশ্নপত্র

পেপার জেনারেটরে হাতে বা স্বয়ংক্রিয়ভাবে প্রশ্ন বেছে প্রশ্ন ও অপশন এলোমেলো করে ক-থেকে ছয়টি পর্যন্ত সেট (A–F) তৈরি করুন। পেপার প্রিভিউতে লেআউট ডিজাইন, পৃষ্ঠা দেখা ও প্রিন্ট করুন। PDF-এর জন্য প্রিন্ট ডায়ালগে "Save as PDF" দিন।

### ৬. ইম্পোর্ট ও এক্সপোর্ট

CSV, XLSX, JSON বা পেস্ট করা লেখা থেকে প্রশ্ন ইম্পোর্ট করুন: প্রিভিউ দেখে সমস্যা ঠিক করে ইম্পোর্ট দিন। এক্সপোর্ট সেন্টার থেকে প্রশ্নপত্র, উত্তরমালা, সমাধান, প্রশ্নব্যাংক বা পরীক্ষার পূর্ণ আর্কাইভ এক্সপোর্ট করুন।

### ৭. ব্যাকআপ

ব্যাকআপ ও রিস্টোর পাতা থেকে নিয়মিত ব্যাকআপ ফাইল বানান। রিস্টোর নতুন কপি যোগ করে; আগের ডেটা মোছে বা বদলায় না।

### ৮. অফলাইন ও সমস্যা

আগে লোড হওয়া ডেটা নিয়ে অ্যাপ অফলাইনেও চলে এবং ইন্টারনেট ফিরলে সিঙ্ক হয়। কোনো ফিল্টার ইনডেক্স চাইলে "firebase deploy" দিয়ে কয়েক মিনিট অপেক্ষা করুন। প্রথমবার পেপার প্রিভিউয়ে বাংলা ফন্ট লোড করতে ইন্টারনেট লাগে।
