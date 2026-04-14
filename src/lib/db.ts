import Database from 'better-sqlite3';
import path from 'path';

const db = new Database('abstraction.db');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'student',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bootcamps (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS modules (
    id TEXT PRIMARY KEY,
    bootcamp_id TEXT NOT NULL,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    description TEXT,
    is_locked_by_default BOOLEAN DEFAULT 1,
    FOREIGN KEY (bootcamp_id) REFERENCES bootcamps(id)
  );

  CREATE TABLE IF NOT EXISTS lesson_sections (
    id TEXT PRIMARY KEY,
    module_id TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    content_type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    coach_prompt_text TEXT,
    FOREIGN KEY (module_id) REFERENCES modules(id)
  );

  CREATE TABLE IF NOT EXISTS pop_quizzes (
    id TEXT PRIMARY KEY,
    module_id TEXT NOT NULL,
    lesson_section_id TEXT,
    question TEXT NOT NULL,
    answer_options TEXT NOT NULL, -- JSON string
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    order_index INTEGER NOT NULL,
    FOREIGN KEY (module_id) REFERENCES modules(id),
    FOREIGN KEY (lesson_section_id) REFERENCES lesson_sections(id)
  );

  CREATE TABLE IF NOT EXISTS lsat_questions (
    id TEXT PRIMARY KEY,
    module_id TEXT NOT NULL,
    prompt TEXT NOT NULL,
    answer_options TEXT NOT NULL, -- JSON string
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    difficulty TEXT,
    source_tag TEXT,
    FOREIGN KEY (module_id) REFERENCES modules(id)
  );

  CREATE TABLE IF NOT EXISTS student_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    module_id TEXT NOT NULL,
    status TEXT DEFAULT 'not_started',
    progress_percent REAL DEFAULT 0,
    last_position INTEGER DEFAULT 0,
    unlocked BOOLEAN DEFAULT 0,
    started_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (module_id) REFERENCES modules(id)
  );

  CREATE TABLE IF NOT EXISTS quiz_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    quiz_id TEXT NOT NULL,
    selected_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (quiz_id) REFERENCES pop_quizzes(id)
  );

  CREATE TABLE IF NOT EXISTS lsat_question_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    lsat_question_id TEXT NOT NULL,
    selected_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (lsat_question_id) REFERENCES lsat_questions(id)
  );

  CREATE TABLE IF NOT EXISTS tutor_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    message TEXT NOT NULL,
    sender_type TEXT NOT NULL, -- 'student' or 'tutor'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Seed initial data if empty
const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  const userId = 'user_1';
  db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)').run(
    userId,
    'Joshua Student',
    'student@example.com',
    '$2a$10$xV.Z8X8X8X8X8X8X8X8X8u', // dummy hash
    'student'
  );

  const bootcampId = 'bootcamp_1';
  db.prepare('INSERT INTO bootcamps (id, title, description) VALUES (?, ?, ?)').run(
    bootcampId,
    'LSAT Mastery Bootcamp',
    'The ultimate guide to mastering the LSAT with Joshua.'
  );

  const modulesData = [
    {
      id: 'module_1',
      title: 'Introduction to Role Questions',
      description: 'Learn the 3-step process to tackle Role Questions on the LSAT.',
      sections: [
        {
          title: 'The First Step: Isolate the Statement',
          body: 'The first thing I do when approaching Role Questions is to isolate the statement/sentence that the question is asking us about. You can do this either by highlighting or underlining it in the stimulus.\n\nI do this to keep myself focused on the task at hand. If we are making careless mistakes and chose the wrong statement to analyze, then whatever skills we have learned regarding this question type will be for nought.\n\nExample:\n"We will see a drastic increase in the cost of food in the near future. War in the Ukraine has caused a significant disturbance on the global supply of grain and livestock feed. *Inflationary pressure on the economy means that prices only have one place to go, and that is up.*"\n\nWhat is the role played by the statement about inflationary pressure?',
          coach: "Always isolate first! It's easy to get lost in the stimulus if you don't know exactly what target you're analyzing."
        },
        {
          title: 'The Second Step: Reading for Structure',
          body: 'When reading the stimulus for Role questions, the reading habits are no different from when we are reading the stimulus of a Find the Conclusion Question. We are reading primarily for structure: we are reading the statements one by one, trying to decipher what the author\'s argument is. We are essentially doing two things: one, categorizing each statement according to their function; and two, finding the conclusion of the argument.\n\nIn our previous example, Statement 1 is an opinion while Statement 2 and 3 are both facts. As such it appears that both 2 and 3 are supporting 1. So statement 1 is the conclusion of this example.\n\nDisrupted supplies will lead to higher costs, inflation also means higher costs. Both are factors contributing to the predicted rise in food prices. Statement 2 and 3 are separate premises each supporting the conclusion, there are no intermediate conclusions in this example!',
          coach: "Structure is everything. Identify the main conclusion first, then see how your isolated statement relates to it."
        },
        {
          title: 'The Third Step: Reconsider the Relationship',
          body: 'Finally, it\'s time to turn to the third step of reading a Role question stimulus: we ask ourselves what is the relationship of the quoted statement to the conclusion of the stimulus?\n\nIn our food cost example, it\'s a premise, independently providing support for the argument\'s conclusion.\n\nLet\'s look at another example:\n"The court system must remain vigilant of the attempts made by politicians to damage its effectiveness. It has been argued that *the separation of powers already keeps a country\'s judicial system independent and free from political interference*. But all political and legal institutions are made by humans, and as such, they are fragile and prone to error."\n\nThe example is arguing for vigilance on the part of judges. That\'s the conclusion. The second statement (the one we isolated) is a defense against political interference. Does this support our conclusion? No, it runs contrary to the spirit of our conclusion and is therefore either a concession or an opposing viewpoint. Because the author disagrees with it ("But all political..."), it is an opposing viewpoint.',
          coach: "Ask yourself: Does this support the conclusion, oppose it, or is it the conclusion itself? This is the core of Role Questions."
        }
      ],
      quiz: {
        question: "What is the difference between a concession and an opposing viewpoint?",
        options: [
          "A concession is something the author agrees with, an opposing viewpoint is not.",
          "An opposing viewpoint is what the other party thinks. A concession is something the speaker acknowledges, but still holds on to their original view despite it.",
          "They are exactly the same thing.",
          "A concession is the main conclusion, an opposing viewpoint is a premise."
        ],
        answer: "An opposing viewpoint is what the other party thinks. A concession is something the speaker acknowledges, but still holds on to their original view despite it.",
        explanation: "As noted in the text, an opposing viewpoint is simply what the other party thinks or believes (which the author disagrees with). A concession is acknowledged by the speaker, who maintains their view despite it."
      }
    },
    {
      id: 'module_2',
      title: 'Role Question Answer Choices',
      description: 'Master the art of de-abstractifying complex LSAT answer choices.',
      sections: [
        {
          title: 'The Hardest Thing about Role Questions',
          body: 'While the way in which we read the stimulus of any Role question is similar to how we approach Find the Conclusion questions, the answer choices we are faced with in Role questions are much more difficult. Life would be so simple if all the answer choices were just asking us if the statement in question is a premise or conclusion, but the test makers love to describe a relatively straightforward concept in abstract and vague language.\n\nAs a result, the successful student should devote the majority of their time and energy to answer choices when approaching Role questions. I use about 60% of all the time to examine answer choices, with the other 40% set aside for reading the question and the stimulus.\n\nThe ability to de-abstractify (translating vague and abstract terms into their stimulus equivalents) is one of the most important skills that the advanced student needs to master.',
          coach: "Don't rush the answer choices! They are designed to confuse you. Spend 60% of your time here, translating their abstract language into concrete terms."
        },
        {
          title: 'Translating Answer Choices 1-5',
          body: '1. "It is used to illustrate the general principle that the argument presupposes"\nTranslation: It\'s an example of a rule that the argument requires.\n\n2. "It is an illustration of a premise that is used to support the argument\'s conclusion"\nTranslation: It is an example of a premise.\n\n3. "It is used to counter a consideration that might be taken to undermine the argument\'s conclusion"\nTranslation: It\'s a pre-emptive strike against a potential objection/counter-argument.\n\n4. "It makes an observation that, according to the argument, is insufficient to justify the claim that the argument concludes is false"\nTranslation: The author is arguing AGAINST an opposing view, and says the opponent\'s observation is not enough to prove their false claim.\n\n5. "It describes a phenomenon for which the argument\'s conclusion is offered as an explanation"\nTranslation: Phenomenon = effect. Explanation = cause. The statement is the effect, and the conclusion is the cause.',
          coach: "Notice how 'illustrate' always means 'example', and 'explanation' means 'cause'. Memorize these LSAT specific definitions!"
        },
        {
          title: 'Translating Answer Choices 6-10',
          body: '6. "It is a general principle whose validity the argument questions"\nTranslation: It\'s a rule that the author is arguing against.\n\n7. "It denies a claim that the argument takes to be assumed in the reasoning it rejects"\nTranslation: The author is rejecting an assumption made by the opponent\'s argument.\n\n8. "It is a claim for which no justification is provided but that is required to establish the argument\'s main conclusion"\nTranslation: It\'s a premise (no justification provided) that supports the conclusion.\n\n9. "It is a claim for which justification is provided and that, if true, establishes the truth of the argument\'s main conclusion"\nTranslation: It has justification (so it\'s a conclusion) and it supports the main conclusion. Therefore, it\'s an intermediate conclusion.\n\n10. "It is what the author\'s argument purports to explain"\nTranslation: Identical to #5. The author describes an effect/phenomenon, and argues for a specific cause.',
          coach: "When you see 'no justification is provided', think 'Premise'. When you see 'justification is provided AND it establishes the truth of...', think 'Intermediate Conclusion'."
        },
        {
          title: 'Translating Answer Choices 11-15',
          body: '11. "It is a hypothesis that the argument attempts to undermine by calling into question the sufficiency of the evidence"\nTranslation: Hypothesis = potential explanation/cause. The author is challenging this hypothesis by saying the evidence isn\'t enough to support it.\n\n12. "It is the conclusion of the argument as a whole but is not the only explicitly stated conclusion in the argument"\nTranslation: It\'s the main conclusion, but there is also an intermediate conclusion present.\n\n13. "It is a statement that the argument is intended to support but is not the conclusion of the argument as a whole"\nTranslation: It is supported by the argument, but isn\'t the main conclusion. It\'s an intermediate conclusion.\n\n14. "It is a statement for which some evidence is provided and that itself is offered as support for the conclusion of the argument as a whole"\nTranslation: Same as above. It\'s an intermediate conclusion.\n\n15. "It is the conclusion of the argument as a whole and is supported by another statement for which support is offered"\nTranslation: It\'s the main conclusion, and it is supported by an intermediate conclusion.',
          coach: "Intermediate conclusions are the most frequently tested structural element in hard Role questions. Learn to spot them!"
        }
      ],
      quiz: {
        question: "On the LSAT, what does the word 'explanation' strictly mean?",
        options: [
          "A detailed description",
          "A cause",
          "An excuse",
          "An intermediate conclusion"
        ],
        answer: "A cause",
        explanation: "As stated in the text, whenever you see the word 'explanation' in an answer choice, check the stimulus for cause-effect reasoning. Explanation simply means 'cause'."
      }
    },
    {
      id: 'module_3',
      title: 'Key Terms & Incorrect Descriptions',
      description: 'Definitions of crucial LSAT vocabulary and strategies for eliminating wrong answers.',
      sections: [
        {
          title: 'Key Terms Dictionary',
          body: '• Presuppose: On the LSAT, presuppose simply means "require." It refers to a necessary condition.\n• Illustrate: An illustration is simply referring to an example or examples.\n• General Principle: A principle is a rule on what we should or shouldn\'t do. It applies to multiple conditions and scenarios.\n• Facts: Statements such as "Canada is the largest country in the world". Not arguments by themselves, but can serve as premises.\n• Decision: A choice made. Can play roles as premises or conclusions.\n• Principle: A generalizable statement used to guide or justify future or past actions or decisions.\n• Generalization: A summary statement derived from smaller findings, like "All swans are white." Generalizations describe what is, while principles prescribe what should be.',
          coach: "Flashcard these terms! Knowing that 'presuppose' means 'require' will save you precious seconds on test day."
        },
        {
          title: 'Identifying Incorrect Descriptions',
          body: 'For questions that require identifying features of the stimulus\' argument (Role, Method, Flaw), it is crucial to spot answer choices that describe something that did not happen in the argument.\n\n• Watchful Eye: Carefully read the answer choices to ensure they accurately reflect the argument.\n• Deviations from the Stimulus: Eliminate choices that describe events or actions not present in the stimulus.\n\nHow to Guide:\n1. Read the Answer Choice Over: Extract any keywords that stand out to you.\n2. Analyze Keywords in LSAT Context: Think about what these keywords mean in a LSAT-specific setting.\n3. Check Keyword Relevance: If it\'s a noun, does this concept appear? If it\'s a verb, does the author do this? If it\'s an adjective/adverb, does it correctly describe the tone?\n4. Match with Stimulus Structure: Read the answer choice again and match it with the stimulus\' structure.\n5. Beware of Traps: A common trick is to provide an almost perfect answer with a glaring error, usually due to one single word.',
          coach: "One wrong word makes the entire answer choice wrong. Be ruthless when eliminating choices that describe things that didn't happen."
        },
        {
          title: 'Assumptions, Implications, and Contradictions',
          body: 'There is a difference between assumptions and implications.\n\n• Assumption: an unstated premise (sometimes answer choices will say sneaky things like IMPLICIT PREMISE which is another way of saying assumption). It links the supporting information and the main conclusion.\n\n• Implication: An implication, on the other hand, is something that will follow if you accept the truth of the conclusion. It\'s an unstated inference if you accept the truth of the argument. Inferences and implications play a big role in Must Be True (MBT) and Most Strongly Supported (MSS) questions.\n\n• Logical contradiction: A logical contradiction is where a state and its denial are existing simultaneously.',
          coach: "Assumptions come BEFORE the conclusion (they are required for it). Implications come AFTER the conclusion (they result from it)."
        }
      ],
      quiz: {
        question: "What is the difference between a Generalization and a Principle?",
        options: [
          "They are the exact same thing.",
          "Generalizations describe what is, while principles prescribe what should or ought to be.",
          "Principles are always true, generalizations are often false.",
          "Generalizations are premises, principles are always conclusions."
        ],
        answer: "Generalizations describe what is, while principles prescribe what should or ought to be.",
        explanation: "As defined in the Key Terms, generalizations summarize findings ('what is'), while principles act as rules for actions ('what should be')."
      }
    },
    {
      id: 'module_4',
      title: 'Homework & Practice',
      description: 'Apply your knowledge with keyword extraction and real LSAT questions.',
      sections: [
        {
          title: 'Homework: Keyword Extraction',
          body: 'Task: Highlight and Extract Keywords, Translate Question Stems into what they mean and what they are looking for.\n\n1. It is used to illustrate the general principle that the argument presupposes.\n2. It is an illustration of a premise that is used to support the argument\'s conclusion.\n3. It is used to counter a consideration that might be taken to undermine the argument\'s conclusion.\n4. It makes an observation that, according to the argument, is insufficient to justify the claim that the argument concludes is false.\n5. It describes a phenomenon for which the argument\'s conclusion is offered as an explanation.\n6. It is a general principle whose validity the argument questions.\n7. It denies a claim that the argument takes to be assumed in the reasoning it rejects.\n8. It is a claim for which no justification is provided but that is required to establish the argument\'s main conclusion.\n9. It is a claim for which justification is provided and that, if true, establishes the truth of the argument\'s main conclusion.\n10. It is what the author\'s argument purports to explain.\n11. It is a hypothesis that the argument attempts to undermine by calling into question the sufficiency of the evidence.\n12. It is the conclusion of the argument as a whole but is not the only explicitly stated conclusion of the argument.\n13. It is a statement that the argument is intended to support but is not the conclusion of the argument as a whole.\n14. It is a statement for which some evidence is provided and that is the conclusion of the argument as a whole.',
          coach: "Take out a piece of paper and write down your translations for these 14 stems. Compare them to the translations we covered in Module 2!"
        },
        {
          title: 'PT34 S3 Q14 Walkthrough',
          body: 'Let\'s break down a real question step by step.\n\nStimulus:\n"People\'s political behavior frequently does not match their rhetoric. Although many complain about government intervention in their lives, *they tend not to re-elect inactive politicians*. But a politician\'s activity consists largely in the passage of laws whose enforcement affects voters\' lives. Thus, voters often re-elect politicians whose behavior they resent."\n\nQuestion: Which one of the following most accurately describes the role played in the argument by the claim that people tend not to re-elect inactive politicians?\n\nStep 1: Isolate the statement. (Done, it\'s italicized above).\n\nStep 2: Read for structure.\nPremise 1: People want governments to leave them alone, but they don\'t vote for politicians who are inactive.\nPremise 2: Active politicians don\'t leave people alone.\nIntermediate Conclusion: People end up voting for politicians that do things they don\'t like (interference).\nMain Conclusion: What people say (leave me alone!) don\'t match what they do (vote for interfering politicians).\n\nStep 3: Reconsider relationship.\nThe statement in question is a premise, and the argument contains two premises, an intermediate conclusion, and a main conclusion. It is a premise offered in support of the intermediate conclusion that voters often re-elect politicians whose behavior they resent.',
          coach: "Notice how the word 'Thus' signals the intermediate conclusion here, while the very first sentence is the overarching main conclusion. Tricky!"
        }
      ],
      lsat: {
        prompt: 'People\'s political behavior frequently does not match their rhetoric. Although many complain about government intervention in their lives, they tend not to re-elect inactive politicians. But a politician\'s activity consists largely in the passage of laws whose enforcement affects voters\' lives. Thus, voters often re-elect politicians whose behavior they resent.\n\nWhich one of the following most accurately describes the role played in the argument by the claim that people tend not to re-elect inactive politicians?',
        options: [
          "It describes a phenomenon for which the argument's conclusion is offered as an explanation",
          "It is a premise offered in support of the conclusion that voters often re-elect politicians whose behavior they resent",
          "It is offered as an example of how a politician's activity consists largely in the passage of laws whose enforcement interferes with voters' lives",
          "It is a generalization based on the claim that people complain about government intervention in their lives",
          "It is cited as evidence that people's behavior never matches their political beliefs"
        ],
        answer: "It is a premise offered in support of the conclusion that voters often re-elect politicians whose behavior they resent",
        explanation: "The statement is a premise that supports the intermediate conclusion ('Thus, voters often re-elect politicians whose behavior they resent'). This intermediate conclusion then supports the main conclusion in the first sentence."
      }
    }
  ];

  modulesData.forEach((m, mIdx) => {
    db.prepare('INSERT INTO modules (id, bootcamp_id, title, order_index, description, is_locked_by_default) VALUES (?, ?, ?, ?, ?, ?)').run(
      m.id,
      bootcampId,
      m.title,
      mIdx + 1,
      m.description,
      mIdx === 0 ? 0 : 1 // Only first module is unlocked by default
    );

    m.sections.forEach((s, sIdx) => {
      const sectionId = `${m.id}_section_${sIdx + 1}`;
      db.prepare('INSERT INTO lesson_sections (id, module_id, order_index, content_type, title, body, coach_prompt_text) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        sectionId,
        m.id,
        sIdx + 1,
        'lesson',
        s.title,
        s.body,
        s.coach
      );

      // Add quiz to the last section if it exists
      if (sIdx === m.sections.length - 1 && m.quiz) {
        db.prepare('INSERT INTO pop_quizzes (id, module_id, lesson_section_id, question, answer_options, correct_answer, explanation, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
          `${m.id}_quiz_1`,
          m.id,
          sectionId,
          m.quiz.question,
          JSON.stringify(m.quiz.options),
          m.quiz.answer,
          m.quiz.explanation,
          1
        );
      }
    });

    // Add LSAT question if it exists
    if (m.lsat) {
      db.prepare('INSERT INTO lsat_questions (id, module_id, prompt, answer_options, correct_answer, explanation, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        `${m.id}_lsat_1`,
        m.id,
        m.lsat.prompt,
        JSON.stringify(m.lsat.options),
        m.lsat.answer,
        m.lsat.explanation,
        'Hard'
      );
    }
  });

  // Initialize progress for the student for the first module
  db.prepare('INSERT INTO student_progress (id, user_id, module_id, status, unlocked) VALUES (?, ?, ?, ?, ?)').run(
    'progress_1',
    userId,
    'module_1',
    'not_started',
    1
  );
}

export default db;
