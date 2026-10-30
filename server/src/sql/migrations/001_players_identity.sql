-- Migration 001_players_identity.sql
-- Delete existing dev rows as per spec
DELETE FROM answers;
DELETE FROM leaderboard;
DELETE FROM players;

-- Add participant_id and contact to players table with UNIQUE (session_id, participant_id)
ALTER TABLE players
  ADD COLUMN participant_id VARCHAR(60) NOT NULL,
  ADD COLUMN contact VARCHAR(120) NOT NULL,
  ADD UNIQUE KEY uniq_session_participant (session_id, participant_id);

-- Set sample quiz questions points to 10
UPDATE questions SET points = 10;

