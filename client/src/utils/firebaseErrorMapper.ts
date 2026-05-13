/**
 * Maps Firebase error codes to user-friendly messages
 */
export function mapFirebaseErrorToMessage(error: any): string {
  const code = error?.code || '';

  const errorMap: Record<string, string> = {
    'auth/invalid-email': 'Invalid email address',
    'auth/user-not-found': 'Email not found. Please sign up first.',
    'auth/wrong-password': 'Incorrect password',
    'auth/email-already-in-use': 'Email already registered',
    'auth/weak-password': 'Password too weak (min 6 characters)',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/operation-not-allowed': 'This operation is not allowed',
    'auth/too-many-requests': 'Too many login attempts. Try again later.',
    'auth/invalid-credential': 'Invalid credentials. Please try again.',
  };

  return errorMap[code] || 'Something went wrong. Please try again.';
}
