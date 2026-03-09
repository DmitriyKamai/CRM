-- Add UNSPECIFIED to Role enum (must be committed before use; default set in next migration).
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'UNSPECIFIED';
