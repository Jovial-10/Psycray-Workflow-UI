-- Phase 2.2 · Remove named admin keys (2026-11-22)
-- The app has no logins or admin keys: access is controlled at the server
-- (VPS / nginx). Publishing and recalculation are open to anyone who can
-- reach the app. Safe to re-run. Only the unused icp_admins table is removed;
-- profiles, versions, research and score history are untouched.
DROP TABLE IF EXISTS icp_admins;
