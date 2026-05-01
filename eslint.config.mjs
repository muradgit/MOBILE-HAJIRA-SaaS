import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';
import nextPlugin from 'eslint-config-next';

export default [
  {
    ignores: ['dist/**/*', '.next/**/*']
  },
  {
    files: ['firestore.rules'],
    plugins: {
      '@firebase/security-rules': firebaseRulesPlugin
    },
    rules: {
      ...firebaseRulesPlugin.configs['flat/recommended'].rules
    }
  }
];
