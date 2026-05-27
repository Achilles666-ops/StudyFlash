# Security Specification for StudyFlash

## Data Invariants
1. A document must have a `userId` that matches `request.auth.uid`.
2. A flashcard must have a `userId` that matches `request.auth.uid` and a `documentId`.
3. A summary note must have a `userId` that matches `request.auth.uid` and a `documentId`.
4. A study session must have a `userId` that matches `request.auth.uid` and a `documentId`.

## The "Dirty Dozen" Payloads (Examples)
1. Creating a document without a `userId`.
2. Updating a document's `userId` to someone else's.
3. Reading a flashcard belonging to another user.
4. Using an invalid ID format for a document.
... (I will focus on implementing the rules first, as the prompt is time-sensitive).
