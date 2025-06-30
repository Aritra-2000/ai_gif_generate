const { AssemblyAI } = require('assemblyai');

const assemblyai = new AssemblyAI({
  apiKey: 'test-key',
});

console.log('AssemblyAI client created');
console.log('Available methods:', Object.keys(assemblyai));
console.log('Files methods:', Object.keys(assemblyai.files || {}));
console.log('Transcripts methods:', Object.keys(assemblyai.transcripts || {})); 