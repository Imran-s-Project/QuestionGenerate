// Strings for the import. Merged into the main dictionary by i18n.js.
export const MORE_I = {
  bn: {
    'i.title': 'প্রশ্ন ইম্পোর্ট', 'i.hint': 'CSV, XLSX বা JSON ফাইল বেছে নিন, অথবা লেখা পেস্ট করুন। ফাইল আপনার ডিভাইসেই পড়া হয়, কোথাও আপলোড হয় না।',
    'i.file': 'ফাইল (CSV, XLSX, JSON)', 'i.paste': 'অথবা এখানে পেস্ট করুন', 'i.status': 'ইম্পোর্ট করা প্রশ্ন যে অবস্থায় সংরক্ষিত হবে', 'i.read': 'পড়ুন',
    'i.template': 'CSV টেমপ্লেট ডাউনলোড', 'i.map': 'কলাম মেলানো', 'i.preview': 'প্রিভিউ', 'i.ready': 'প্রস্তুত', 'i.dup': 'প্রশ্নব্যাংকে একই রকম প্রশ্ন আছে', 'i.dupFile': 'ফাইলে একই প্রশ্ন আগেও আছে',
    'i.counts': '{ready}টি প্রস্তুত · {dup}টি সম্ভাব্য ডুপ্লিকেট · {bad}টিতে সমস্যা', 'i.go': '{n}টি প্রশ্ন ইম্পোর্ট করুন', 'i.cancel': 'ইম্পোর্ট বন্ধ করুন',
    'i.progress': '{done}/{total}টি সংরক্ষিত হয়েছে', 'i.report': 'ইম্পোর্ট রিপোর্ট', 'i.imported': '{n}টি ইম্পোর্ট হয়েছে', 'i.skipped': '{n}টি বাদ গেছে (ডুপ্লিকেট, সমস্যা বা টিক ছাড়া)',
    'i.notSaved': '{n}টি সংরক্ষিত হয়নি', 'i.failedRows': 'সারি {from} থেকে {to}-এ সংরক্ষণ থেমে গেছে: {msg}', 'i.stopped': 'ইম্পোর্ট থামানো হয়েছে। যা ইম্পোর্ট হয়েছে বলা আছে তা সংরক্ষিত; বাকিগুলো লেখা হয়নি।',
    'i.noRows': 'এই ফাইলে কোনো প্রশ্ন পাওয়া যায়নি।', 'i.badFile': 'ফাইলটি পড়া যায়নি। ফরম্যাট ঠিক আছে কি না দেখুন।', 'i.cap': 'প্রথম ২,০০০টি সারি পড়া হয়েছে।',
    'i.newSubjects': 'নতুন বিষয় তৈরি হবে: {names}', 'i.confirm': '{name}-এ {n}টি প্রশ্ন ইম্পোর্ট করবেন? ডুপ্লিকেট ও সমস্যাযুক্ত সারি বাদ যাবে।',
    'i.err.type': 'প্রশ্নের ধরন চেনা যায়নি।', 'i.err.family': 'এই ধরনের প্রশ্নের জন্য JSON ইম্পোর্ট লাগবে।', 'i.err.difficulty': 'কাঠিন্যস্তর easy, medium বা hard হতে হবে।'
  },
  en: {
    'i.title': 'Import questions', 'i.hint': 'Choose a CSV, XLSX or JSON file, or paste text. The file is read on your device and never uploaded.',
    'i.file': 'File (CSV, XLSX, JSON)', 'i.paste': 'Or paste here', 'i.status': 'Save imported questions as', 'i.read': 'Read',
    'i.template': 'Download a CSV template', 'i.map': 'Match columns', 'i.preview': 'Preview', 'i.ready': 'Ready', 'i.dup': 'A similar question is already in the bank', 'i.dupFile': 'The same question appears earlier in the file',
    'i.counts': '{ready} ready · {dup} possible duplicates · {bad} with problems', 'i.go': 'Import {n} questions', 'i.cancel': 'Stop import',
    'i.progress': '{done} of {total} saved', 'i.report': 'Import report', 'i.imported': '{n} imported', 'i.skipped': '{n} skipped (duplicates, problems or unticked)',
    'i.notSaved': '{n} not saved', 'i.failedRows': 'Saving stopped at rows {from} to {to}: {msg}', 'i.stopped': 'Import stopped. What is reported as imported is saved; the rest was not written.',
    'i.noRows': 'No questions were found in this input.', 'i.badFile': 'This file could not be read. Check its format.', 'i.cap': 'Only the first 2,000 rows are read.',
    'i.newSubjects': 'New subjects will be created: {names}', 'i.confirm': 'Import {n} questions into {name}? Duplicates and rows with problems are skipped.',
    'i.err.type': 'The question type is not recognised.', 'i.err.family': 'This question type needs the JSON import.', 'i.err.difficulty': 'Difficulty must be easy, medium or hard.'
  }
};
