
import { ChecklistSection } from './types';

export const OFFICIAL_SOLURB_ITEMS = [
  // MOTOR
  { id: 1, label: "1. Nível de Óleo Hidráulico - Recolher Pistões", category: "MOTOR (VEÍCULO DESLIGADO)" },
  // CABINE
  { id: 2, label: "2. Chave Roda/Macaco/Estepe", category: "CABINE INTERNA/EXTERNA" },
  { id: 3, label: "3. Limpeza e Conservação da Cabine", category: "CABINE INTERNA/EXTERNA" },
  { id: 4, label: "4. Bancos e Tapetes", category: "CABINE INTERNA/EXTERNA" },
  { id: 5, label: "5. Para-brisas", category: "CABINE INTERNA/EXTERNA" },
  { id: 6, label: "6. Instrumentos do Painel", category: "CABINE INTERNA/EXTERNA" },
  { id: 7, label: "7. Alavanca de Câmbio - Capa Sanfonada", category: "CABINE INTERNA/EXTERNA" },
  { id: 8, label: "8. Triângulo", category: "CABINE INTERNA/EXTERNA" },
  { id: 9, label: "9. CRLV (Documento)", category: "CABINE INTERNA/EXTERNA" },
  { id: 10, label: "10. Tampa da Caixa de Fusível", category: "CABINE INTERNA/EXTERNA" },
  { id: 11, label: "11. Suporte para Celular/Carregador", category: "CABINE INTERNA/EXTERNA" },
  { id: 12, label: "12. Alavanca de Regulagem do Volante", category: "CABINE INTERNA/EXTERNA" },
  { id: 13, label: "13. Pino (para reboque do veículo)", category: "CABINE INTERNA/EXTERNA" },
  { id: 14, label: "14. Extintor", category: "CABINE INTERNA/EXTERNA" },
  { id: 15, label: "15. Quebra-sol", category: "CABINE INTERNA/EXTERNA" },
  { id: 16, label: "16. Tampa Porta-luvas", category: "CABINE INTERNA/EXTERNA" },
  { id: 17, label: "17. Retrovisores", category: "CABINE INTERNA/EXTERNA" },
  { id: 18, label: "18. Espelhos Auxiliares", category: "CABINE INTERNA/EXTERNA" },
  { id: 19, label: "19. Maçanetas", category: "CABINE INTERNA/EXTERNA" },
  { id: 20, label: "20. Faróis e Lanternas (Quebrada e/ou Trincada)", category: "CABINE INTERNA/EXTERNA" },
  { id: 21, label: "21. Para-choque, Para-lamas e Para-barro", category: "CABINE INTERNA/EXTERNA" },
  // BAÚ
  { id: 22, label: "22. Alavancas de Acionamento Comando (Tras/Diant)", category: "BAÚ" },
  { id: 23, label: "23. Mangueiras e Canos Hidráulicos (Vazamento)", category: "BAÚ" },
  { id: 24, label: "24. Cilindros Hidráulicos (Vazamentos e Pinos)", category: "BAÚ" },
  { id: 25, label: "25. Plataforma Operacional/Barra de Apoio - Coletores", category: "BAÚ" },
  { id: 26, label: "26. Vassoura e Pá", category: "BAÚ" },
  { id: 27, label: "27. Lanternas e Giroflex (Quebrada, Trincada)", category: "BAÚ" },
  { id: 28, label: "28. Grade de Proteção Danificada", category: "BAÚ" },
  { id: 29, label: "29. Câmeras (Ré e Monitoramento)", category: "BAÚ" },
  { id: 30, label: "30. Corote e Dispenser de Detergente", category: "BAÚ" },
  // GERAL
  { id: 31, label: "31. Tampa do Tanque de Combustível", category: "GERAL" },
  { id: 32, label: "32. Tampa da Bateria", category: "GERAL" },
  { id: 33, label: "33. Ar Condicionado/Funcionamento", category: "GERAL" },
  { id: 34, label: "34. Pneus (Cortados e/ou Pintados na Guia)", category: "GERAL" },
  { id: 35, label: "35. Molejos Traseiros", category: "GERAL" },
  { id: 36, label: "36. Molejos Dianteiros", category: "GERAL" },
  { id: 37, label: "37. Rodas (Trincadas e/ou sem parafusos)", category: "GERAL" },
  { id: 38, label: "38. Cabo de Basculamento da Cabine", category: "GERAL" },
  { id: 39, label: "39. Calço de Roda", category: "GERAL" },
  // FUNCIONAMENTO
  { id: 40, label: "40. Tomada de Força (Funcionamento e/ou Vazamento)", category: "VERIFICAR FUNCIONAMENTO" },
  { id: 41, label: "41. Aceleração Automática", category: "VERIFICAR FUNCIONAMENTO" },
  { id: 42, label: "42. Sistema Hidráulico", category: "VERIFICAR FUNCIONAMENTO" },
  { id: 43, label: "43. Limpadores de Para-brisa", category: "VERIFICAR FUNCIONAMENTO" },
  { id: 44, label: "44. Luzes - Freio - Pisca - Ré - Alerta - Faróis", category: "VERIFICAR FUNCIONAMENTO" },
  { id: 45, label: "45. Alarme de Ré - Luz de Placa - Giroflex", category: "VERIFICAR FUNCIONAMENTO" },
  { id: 46, label: "46. Botoeira de Acionamento", category: "VERIFICAR FUNCIONAMENTO" },
  { id: 47, label: "47. Botoeira de Emergência", category: "VERIFICAR FUNCIONAMENTO" },
  { id: 48, label: "48. Lanterna Auxiliar", category: "VERIFICAR FUNCIONAMENTO" }
];
