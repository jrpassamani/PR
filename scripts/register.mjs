// Registra o resolver hook para os testes rodarem no Node (ver ts-resolver.mjs).
import { register } from 'node:module';
register('./ts-resolver.mjs', import.meta.url);
