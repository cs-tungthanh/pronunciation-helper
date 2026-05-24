/**
 * Common English contractions mapped to their expanded forms
 * Used to improve IPA lookup success rate for casual text
 */
export const CONTRACTIONS: Record<string, string> = {
  // Negations
  "aren't": "are not",
  "can't": "cannot",
  "couldn't": "could not",
  "didn't": "did not",
  "doesn't": "does not",
  "don't": "do not",
  "hadn't": "had not",
  "hasn't": "has not",
  "haven't": "have not",
  "isn't": "is not",
  "mightn't": "might not",
  "mustn't": "must not",
  "needn't": "need not",
  "shan't": "shall not",
  "shouldn't": "should not",
  "wasn't": "was not",
  "weren't": "were not",
  "won't": "will not",
  "wouldn't": "would not",

  // Pronouns + be
  "i'm": "I am",
  "you're": "you are",
  "he's": "he is",
  "she's": "she is",
  "it's": "it is",
  "we're": "we are",
  "they're": "they are",
  "that's": "that is",
  "there's": "there is",
  "here's": "here is",
  "who's": "who is",
  "what's": "what is",
  "where's": "where is",

  // Pronouns + will
  "i'll": "I will",
  "you'll": "you will",
  "he'll": "he will",
  "she'll": "she will",
  "it'll": "it will",
  "we'll": "we will",
  "they'll": "they will",
  "that'll": "that will",

  // Pronouns + have
  "i've": "I have",
  "you've": "you have",
  "we've": "we have",
  "they've": "they have",

  // Pronouns + would/had
  "i'd": "I would",
  "you'd": "you would",
  "he'd": "he would",
  "she'd": "she would",
  "it'd": "it would",
  "we'd": "we would",
  "they'd": "they would",

  // Other common contractions
  "let's": "let us",
  "ma'am": "madam",
  "o'clock": "of the clock",
  "y'all": "you all",
};
