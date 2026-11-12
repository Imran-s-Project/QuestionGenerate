// Strings for exam setup and paper generation. Merged into the main dictionary by i18n.js.
export const MORE_X = {
  bn: {
    'x.new': 'নতুন পরীক্ষা', 'x.edit': 'পরীক্ষা সম্পাদনা', 'x.sections': 'সেকশন ও নম্বর বণ্টন', 'x.addSection': 'সেকশন যোগ করুন', 'x.secTitle': 'সেকশনের নাম',
    'x.anyType': 'যেকোনো ধরন', 'x.count': 'প্রশ্নসংখ্যা', 'x.marksEach': 'প্রতিটির নম্বর', 'x.title': 'পরীক্ষার নাম', 'x.code': 'পরীক্ষার কোড', 'x.version': 'সংস্করণ',
    'x.categoryId': 'পরীক্ষার ক্যাটাগরি', 'x.newCategory': 'নতুন ক্যাটাগরি', 'x.examType': 'পরীক্ষার ধরন', 'x.session': 'শিক্ষাবর্ষ', 'x.className': 'শ্রেণি', 'x.department': 'বিভাগ',
    'x.group': 'গ্রুপ', 'x.subjectId': 'বিষয়', 'x.date': 'তারিখ', 'x.startTime': 'শুরুর সময়', 'x.endTime': 'শেষের সময়', 'x.durationMin': 'সময়কাল (মিনিট)',
    'x.totalMarks': 'মোট নম্বর', 'x.passMarks': 'পাস নম্বর', 'x.negativeMarking': 'নেগেটিভ মার্কিং', 'x.instructions': 'নির্দেশনা', 'x.status': 'অবস্থা',
    'x.sumQ': 'প্রশ্ন', 'x.sumSections': 'সেকশনের যোগফল', 'x.save': 'পরীক্ষা সংরক্ষণ করুন', 'status.final': 'চূড়ান্ত',
    'x.err.noSections': 'কমপক্ষে একটি সেকশন যোগ করুন।', 'x.err.section': 'প্রতিটি সেকশনের নাম, ০-এর বেশি প্রশ্নসংখ্যা ও ০-এর বেশি নম্বর থাকতে হবে।',
    'x.err.total': 'সেকশনগুলোর যোগফল {sum}, কিন্তু পরীক্ষার মোট নম্বর {total}। মোট নম্বর বা কোনো সেকশন ঠিক করুন।',
    'x.err.pass': 'পাস নম্বর ({pass}) মোট নম্বরের ({total}) চেয়ে বেশি।', 'x.err.time': 'শুরু ও শেষের সময়ের ব্যবধান {span} মিনিট, কিন্তু সময়কাল {dur} মিনিট।',
    'x.err.final': 'পরীক্ষা চূড়ান্ত করার আগে সমস্যাগুলো ঠিক করুন।', 'x.setsCleared': 'সেকশন বদলেছে, তাই তৈরি করা সেটগুলো মুছে গেছে। আবার তৈরি করুন।',
    'x.gen.selected': '{have}/{need}টি নির্বাচিত', 'x.gen.auto': 'স্বয়ংক্রিয় পূরণ', 'x.gen.manual': 'হাতে যোগ করুন', 'x.gen.pool': 'শর্তে মেলে এমন মাত্র {n}টি প্রশ্ন পাওয়া গেছে।',
    'x.gen.sets': 'প্রশ্নের সেট', 'x.gen.numSets': 'সেটের সংখ্যা', 'x.gen.shuffleQ': 'প্রশ্নের ক্রম এলোমেলো করুন', 'x.gen.shuffleO': 'অপশনের ক্রম এলোমেলো করুন',
    'x.gen.make': 'সেট তৈরি করুন', 'x.gen.key': 'উত্তরমালা', 'x.gen.stale': 'নির্বাচন বদলালে তৈরি করা সেট মুছে যায়। আবার সেট তৈরি করুন।', 'x.gen.set': 'সেট {label}',
    'x.err.count': '"{title}": {have}টি নির্বাচিত, দরকার {need}টি।', 'x.err.dupSel': 'একই প্রশ্ন একাধিকবার নির্বাচিত হয়েছে।', 'x.err.inactive': 'নির্বাচিত কিছু প্রশ্ন পাওয়া যাচ্ছে না বা সক্রিয় নয়।',
    'x.warn.marks': '{n}টি নির্বাচিত প্রশ্নের নম্বর তাদের সেকশনের নম্বরের সাথে মেলে না। প্রশ্নপত্রে সেকশনের নম্বর ধরা হবে।'
  },
  en: {
    'x.new': 'New exam', 'x.edit': 'Edit exam', 'x.sections': 'Sections and marks distribution', 'x.addSection': 'Add section', 'x.secTitle': 'Section title',
    'x.anyType': 'Any type', 'x.count': 'Questions', 'x.marksEach': 'Marks each', 'x.title': 'Exam title', 'x.code': 'Exam code', 'x.version': 'Version',
    'x.categoryId': 'Exam category', 'x.newCategory': 'New category', 'x.examType': 'Exam type', 'x.session': 'Academic session', 'x.className': 'Class', 'x.department': 'Department',
    'x.group': 'Group', 'x.subjectId': 'Subject', 'x.date': 'Date', 'x.startTime': 'Start time', 'x.endTime': 'End time', 'x.durationMin': 'Duration (minutes)',
    'x.totalMarks': 'Total marks', 'x.passMarks': 'Pass marks', 'x.negativeMarking': 'Negative marking', 'x.instructions': 'Instructions', 'x.status': 'Status',
    'x.sumQ': 'Questions', 'x.sumSections': 'Sections add up to', 'x.save': 'Save exam', 'status.final': 'Final',
    'x.err.noSections': 'Add at least one section.', 'x.err.section': 'Every section needs a title, more than 0 questions and more than 0 marks each.',
    'x.err.total': 'Sections add up to {sum} marks but the exam total is {total}. Change the total or a section.',
    'x.err.pass': 'Pass marks ({pass}) are higher than the total ({total}).', 'x.err.time': 'Start and end time span {span} minutes but the duration is {dur}.',
    'x.err.final': 'Fix these issues before marking the exam final.', 'x.setsCleared': 'The sections changed, so generated sets were cleared. Generate them again.',
    'x.gen.selected': '{have} of {need} selected', 'x.gen.auto': 'Auto-fill', 'x.gen.manual': 'Add manually', 'x.gen.pool': 'Only {n} matching questions were found.',
    'x.gen.sets': 'Question sets', 'x.gen.numSets': 'Number of sets', 'x.gen.shuffleQ': 'Shuffle question order', 'x.gen.shuffleO': 'Shuffle option order',
    'x.gen.make': 'Generate sets', 'x.gen.key': 'Answer key', 'x.gen.stale': 'Changing the selection clears generated sets. Generate them again.', 'x.gen.set': 'Set {label}',
    'x.err.count': '"{title}": {have} selected, {need} needed.', 'x.err.dupSel': 'The same question is selected more than once.', 'x.err.inactive': 'Some selected questions are missing or not active.',
    'x.warn.marks': '{n} selected question(s) have different marks than their section. The paper uses the section marks.'
  }
};
