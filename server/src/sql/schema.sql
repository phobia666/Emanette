CREATE DATABASE IF NOT EXISTS quizapp CHARACTER SET utf8mb4;
USE quizapp;

CREATE TABLE IF NOT EXISTS quizzes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  instructions TEXT,
  time_per_question INT NOT NULL DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- correct_answer JSON:
--   single/truefalse -> [optionId]
--   multiple         -> [optionId, optionId, ...]
--   text             -> ["accepted answer", "another accepted answer"]
CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  text TEXT NOT NULL,
  type ENUM('single','multiple','truefalse','text') NOT NULL DEFAULT 'single',
  points INT NOT NULL DEFAULT 10,
  time_limit INT NULL,
  position INT NOT NULL,
  correct_answer JSON NOT NULL,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  label VARCHAR(300) NOT NULL,
  position INT NOT NULL,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  code VARCHAR(10) NOT NULL UNIQUE,
  status ENUM('lobby','live','finished') NOT NULL DEFAULT 'lobby',
  leaderboard_published TINYINT(1) NOT NULL DEFAULT 0,
  started_at DATETIME NULL,
  ended_at DATETIME NULL,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
);

CREATE TABLE IF NOT EXISTS players (
  id CHAR(36) PRIMARY KEY,
  session_id INT NOT NULL,
  name VARCHAR(60) NOT NULL,
  participant_id VARCHAR(60) NOT NULL,
  contact VARCHAR(120) NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_session_participant (session_id, participant_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_id CHAR(36) NOT NULL,
  question_id INT NOT NULL,
  answer JSON NULL,
  answered TINYINT(1) NOT NULL DEFAULT 1,
  is_correct TINYINT(1) NOT NULL,
  points INT NOT NULL,
  response_ms INT NOT NULL,
  UNIQUE KEY uniq_player_question (player_id, question_id),
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS leaderboard (
  session_id INT NOT NULL,
  player_id CHAR(36) NOT NULL,
  total_points INT NOT NULL,
  total_time_ms INT NOT NULL,
  `rank` INT NOT NULL,
  PRIMARY KEY (session_id, player_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);
