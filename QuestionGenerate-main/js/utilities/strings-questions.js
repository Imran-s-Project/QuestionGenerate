// Strings for the question builder and bank. Merged into the main dictionary by i18n.js.
export const MORE_Q = {
  bn: {
    'q.type': 'প্রশ্নের ধরন', 'q.statement': 'প্রশ্ন', 'q.imageUrl': 'ছবির URL (https)', 'q.instructions': 'নির্দেশনা', 'q.topic': 'টপিক', 'q.chapter': 'অধ্যায়', 'q.category': 'বিভাগ',
    'q.marks': 'নম্বর', 'q.negativeMarks': 'ঋণাত্মক নম্বর', 'q.timeSeconds': 'সময় (সেকেন্ড)', 'q.tags': 'ট্যাগ (কমা দিয়ে আলাদা করুন)', 'q.explanation': 'ব্যাখ্যা (উত্তরমালা)',
    'q.notes': 'অভ্যন্তরীণ নোট (উত্তরমালা)', 'q.status': 'অবস্থা', 'q.difficulty': 'কাঠিন্যস্তর', 'q.subject': 'বিষয়', 'q.newSubject': 'নতুন বিষয়',
    'q.option': 'অপশন', 'q.left': 'বাম পাশ', 'q.right': 'ডান পাশ', 'q.item': 'আইটেম (সঠিক ক্রমে)', 'q.subq': 'উপ-প্রশ্ন', 'q.answer': 'উত্তর', 'q.correct': 'সঠিক উত্তর',
    'q.add': 'সারি যোগ করুন', 'q.true': 'সত্য', 'q.false': 'মিথ্যা', 'q.blanks': 'উত্তর, প্রতি লাইনে একটি (শূন্যস্থানের ক্রমে)', 'q.model': 'আদর্শ উত্তর',
    'q.symbols': 'চিহ্ন', 'q.preview': 'প্রিভিউ', 'q.new': 'নতুন প্রশ্ন', 'q.edit': 'প্রশ্ন সম্পাদনা', 'q.save': 'প্রশ্ন সংরক্ষণ করুন',
    'q.dup': 'একই রকম একটি প্রশ্ন আগে থেকেই আছে: "{text}"। তবুও সংরক্ষণ করবেন?',
    'q.err.statement': 'প্রশ্নের লেখা দিন।', 'q.err.marks': 'নম্বর ০ বা তার বেশি হতে হবে।', 'q.err.options': 'কমপক্ষে দুটি সারি পূরণ করুন।', 'q.err.correct': 'সঠিক উত্তরটি চিহ্নিত করুন।',
    'q.err.blanks': 'প্রশ্নের ___ শূন্যস্থানের সমান সংখ্যক উত্তর লিখুন, প্রতি লাইনে একটি।', 'q.err.sum': 'উপ-প্রশ্নের নম্বরের যোগফল প্রশ্নের মোট নম্বরের সমান হতে হবে।',
    'diff.easy': 'সহজ', 'diff.medium': 'মাঝারি', 'diff.hard': 'কঠিন', 'status.draft': 'খসড়া', 'status.archived': 'আর্কাইভ করা',
    'fam.choice': 'বহুনির্বাচনি, একটি সঠিক', 'fam.multi': 'বহুনির্বাচনি, একাধিক সঠিক', 'fam.truefalse': 'সত্য / মিথ্যা', 'fam.blank': 'শূন্যস্থান পূরণ',
    'fam.text': 'লিখিত উত্তর', 'fam.match': 'জোড়া মেলানো', 'fam.order': 'ক্রম সাজানো', 'fam.structured': 'উপ-প্রশ্নসমূহ',
    'ct.title': 'নিজস্ব প্রশ্নের ধরন তৈরি করুন', 'ct.name': 'ধরনের নাম', 'ct.desc': 'বিবরণ', 'ct.family': 'উত্তরের ধরন', 'ct.count': 'ডিফল্ট সারির সংখ্যা',
    'ct.criteria': 'মূল্যায়নের মানদণ্ড (ঐচ্ছিক)', 'ct.create': 'ধরন তৈরি করুন',
    'bank.search': 'প্রশ্ন খুঁজুন', 'bank.none': 'ফিল্টার নেই', 'bank.tag': 'ট্যাগ', 'bank.more': 'আরও দেখুন', 'bank.empty': 'কোনো প্রশ্ন মেলেনি।', 'bank.edit': 'সম্পাদনা',
    'bank.duplicate': 'কপি করুন', 'bank.archive': 'আর্কাইভ', 'bank.restore': 'ফিরিয়ে আনুন', 'bank.delete': 'মুছুন', 'bank.selected': '{n}টি নির্বাচিত',
    'bank.deleteWarn': 'এই প্রশ্ন ও এর উত্তরমালা চিরতরে মুছে ফেলবেন? আবার লাগতে পারে মনে হলে বরং আর্কাইভ করুন।',
    'err.index': 'এই ফিল্টারের জন্য ডাটাবেস ইনডেক্স দরকার। firestore.indexes.json ডিপ্লয় করুন (firebase deploy), কয়েক মিনিট অপেক্ষা করে আবার চেষ্টা করুন।'
  },
  en: {
    'q.type': 'Question type', 'q.statement': 'Question', 'q.imageUrl': 'Image URL (https)', 'q.instructions': 'Instructions', 'q.topic': 'Topic', 'q.chapter': 'Chapter', 'q.category': 'Category',
    'q.marks': 'Marks', 'q.negativeMarks': 'Negative marks', 'q.timeSeconds': 'Time (seconds)', 'q.tags': 'Tags (comma separated)', 'q.explanation': 'Explanation (answer key)',
    'q.notes': 'Internal notes (answer key)', 'q.status': 'Status', 'q.difficulty': 'Difficulty', 'q.subject': 'Subject', 'q.newSubject': 'New subject',
    'q.option': 'Option', 'q.left': 'Left', 'q.right': 'Right', 'q.item': 'Item (in correct order)', 'q.subq': 'Sub-question', 'q.answer': 'Answer', 'q.correct': 'Correct answer',
    'q.add': 'Add row', 'q.true': 'True', 'q.false': 'False', 'q.blanks': 'Answers, one per line, in blank order', 'q.model': 'Model answer',
    'q.symbols': 'Symbols', 'q.preview': 'Preview', 'q.new': 'New question', 'q.edit': 'Edit question', 'q.save': 'Save question',
    'q.dup': 'A similar question already exists: "{text}". Save anyway?',
    'q.err.statement': 'Write the question text.', 'q.err.marks': 'Marks must be 0 or more.', 'q.err.options': 'Fill in at least two rows.', 'q.err.correct': 'Mark the correct answer.',
    'q.err.blanks': 'Write one answer per line, as many as the ___ blanks in the question.', 'q.err.sum': 'Sub-question marks must add up to the question marks.',
    'diff.easy': 'Easy', 'diff.medium': 'Medium', 'diff.hard': 'Hard', 'status.draft': 'Draft', 'status.archived': 'Archived',
    'fam.choice': 'Choice, one correct', 'fam.multi': 'Choice, many correct', 'fam.truefalse': 'True / False', 'fam.blank': 'Fill in the blanks',
    'fam.text': 'Written answer', 'fam.match': 'Matching pairs', 'fam.order': 'Ordering', 'fam.structured': 'Sub-questions',
    'ct.title': 'Create a custom question type', 'ct.name': 'Type name', 'ct.desc': 'Description', 'ct.family': 'Answer format', 'ct.count': 'Default number of rows',
    'ct.criteria': 'Evaluation criteria (optional)', 'ct.create': 'Create type',
    'bank.search': 'Search questions', 'bank.none': 'No filter', 'bank.tag': 'Tag', 'bank.more': 'Load more', 'bank.empty': 'No questions match.', 'bank.edit': 'Edit',
    'bank.duplicate': 'Duplicate', 'bank.archive': 'Archive', 'bank.restore': 'Restore', 'bank.delete': 'Delete', 'bank.selected': '{n} selected',
    'bank.deleteWarn': 'Delete this question and its answer key permanently? Archive it instead if you may need it again.',
    'err.index': 'This filter needs a database index. Deploy firestore.indexes.json (firebase deploy), wait a few minutes, then try again.'
  }
};
