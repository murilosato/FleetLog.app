
import { ChecklistSection, ItemStatus } from './types';

export const INITIAL_CHECKLIST_DATA: ChecklistSection[] = [
  {
    title: "MOTOR (VEÍCULO DESLIGADO)",
    items: [
      { id: 1, label: "Nível de Óleo Hidráulico - Recolher Pistões", surveyed: false }
    ]
  },
  {
    title: "CABINE INTERNA/EXTERNA",
    items: [
      { id: 2, label: "Chave Roda/Macaco/Estepe", surveyed: false },
      { id: 3, label: "Limpeza e Conservação da Cabine", surveyed: false },
      { id: 4, label: "Bancos e Tapetes", surveyed: false },
      { id: 5, label: "Para-brisas", surveyed: false },
      { id: 6, label: "Instrumentos do Painel", surveyed: false },
      { id: 7, label: "Alavanca de Câmbio - Capa Sanfonada", surveyed: false },
      { id: 8, label: "Triângulo", surveyed: false },
      { id: 9, label: "CRLV (Documento)", surveyed: false },
      { id: 10, label: "Tampa da Caixa de Fusível", surveyed: false },
      { id: 11, label: "Suporte para Celular/Carregador", surveyed: false },
      { id: 12, label: "Alavanca de Regulagem do Volante", surveyed: false },
      { id: 13, label: "Pino (para reboque do veículo)", surveyed: false },
      { id: 14, label: "Extintor", surveyed: false },
      { id: 15, label: "Quebra-sol", surveyed: false },
      { id: 16, label: "Tampa Porta-luvas", surveyed: false },
      { id: 17, label: "Retrovisores", surveyed: false },
      { id: 18, label: "Espelhos Auxiliares", surveyed: false },
      { id: 19, label: "Maçanetas", surveyed: false },
      { id: 20, label: "Faróis e Lanternas (Quebrada e/ou Trincada)", surveyed: false },
      { id: 21, label: "Para-choque, Para-lamas e Para-barro", surveyed: false }
    ]
  },
  {
    title: "BAÚ",
    items: [
      { id: 22, label: "Alavancas de Acionamento Comando (Tras/Diant)", surveyed: false },
      { id: 23, label: "Mangueiras e Canos Hidráulicos (Vazamento)", surveyed: false },
      { id: 24, label: "Cilindros Hidráulicos (Vazamentos e Pinos)", surveyed: false },
      { id: 25, label: "Plataforma Operacional/Barra de Apoio - Coletores", surveyed: false },
      { id: 26, label: "Vassoura e Pá", surveyed: false },
      { id: 27, label: "Lanternas e Giroflex (Quebrada, Trincada)", surveyed: false },
      { id: 28, label: "Grade de Proteção Danificada", surveyed: false },
      { id: 29, label: "Câmeras (Ré e Monitoramento)", surveyed: false },
      { id: 30, label: "Corote e Dispenser de Detergente", surveyed: false }
    ]
  },
  {
    title: "GERAL",
    items: [
      { id: 31, label: "Tampa do Tanque de Combustível", surveyed: false },
      { id: 32, label: "Tampa da Bateria", surveyed: false },
      { id: 33, label: "Ar Condicionado/Funcionamento", surveyed: false },
      { id: 34, label: "Pneus (Cortados e/ou Pintados na Guia)", surveyed: false },
      { id: 35, label: "Molejos Traseiros", surveyed: false },
      { id: 36, label: "Molejos Dianteiros", surveyed: false },
      { id: 37, label: "Rodas (Trincadas e/ou sem parafusos)", surveyed: false },
      { id: 38, label: "Cabo de Basculamento da Cabine", surveyed: false },
      { id: 39, label: "Calço de Roda", surveyed: false }
    ]
  },
  {
    title: "VERIFICAR FUNCIONAMENTO",
    items: [
      { id: 40, label: "Tomada de Força (Funcionamento e/ou Vazamento)", surveyed: false },
      { id: 41, label: "Aceleração Automática", surveyed: false },
      { id: 42, label: "Sistema Hidráulico", surveyed: false },
      { id: 43, label: "Limpadores de Para-brisa", surveyed: false },
      { id: 44, label: "Luzes - Freio - Pisca - Ré - Alerta - Faróis", surveyed: false },
      { id: 45, label: "Alarme de Ré - Luz de Placa - Giroflex", surveyed: false },
      { id: 46, label: "Botoeira de Acionamento", surveyed: false },
      { id: 47, label: "Botoeira de Emergência", surveyed: false },
      { id: 48, label: "Lanterna Auxiliar", surveyed: false }
    ]
  }
];
