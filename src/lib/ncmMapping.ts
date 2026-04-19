import type { Sector } from "./types.ts";

export interface NcmMapping {
  ncm?: string;
  nbs?: string;
  cst: string;
}

const SECTOR_MAPPING: Record<Sector, NcmMapping> = {
  comercio: {
    ncm: "9999.00.00",
    cst: "00",
  },
  servicos: {
    nbs: "1.01.01",
    cst: "04",
  },
  saude: {
    nbs: "4.01.01",
    cst: "03",
  },
  educacao: {
    nbs: "8.01.01",
    cst: "03",
  },
  alimentacao: {
    ncm: "2101.12.00",
    cst: "03",
  },
  construcao: {
    ncm: "9406.00.00",
    cst: "04",
  },
  transporte: {
    nbs: "3.02.01",
    cst: "04",
  },
  tecnologia: {
    ncm: "8517.13.00",
    cst: "04",
  },
  profissoes_regulamentadas: {
    nbs: "1.02.01",
    cst: "04",
  },
  agronegocio: {
    ncm: "0101.20.00",
    cst: "03",
  },
  outro: {
    ncm: "9999.00.00",
    cst: "00",
  },
};

export function getNcmMapping(sector: Sector): NcmMapping {
  return SECTOR_MAPPING[sector] ?? SECTOR_MAPPING.outro;
}

export const UF_LIST = [
  { code: "AC", name: "Acre", ibge: "12" },
  { code: "AL", name: "Alagoas", ibge: "27" },
  { code: "AM", name: "Amazonas", ibge: "13" },
  { code: "AP", name: "Amapá", ibge: "16" },
  { code: "BA", name: "Bahia", ibge: "29" },
  { code: "CE", name: "Ceará", ibge: "23" },
  { code: "DF", name: "Distrito Federal", ibge: "53" },
  { code: "ES", name: "Espírito Santo", ibge: "32" },
  { code: "GO", name: "Goiás", ibge: "52" },
  { code: "MA", name: "Maranhão", ibge: "21" },
  { code: "MG", name: "Minas Gerais", ibge: "31" },
  { code: "MS", name: "Mato Grosso do Sul", ibge: "50" },
  { code: "MT", name: "Mato Grosso", ibge: "51" },
  { code: "PA", name: "Pará", ibge: "15" },
  { code: "PB", name: "Paraíba", ibge: "25" },
  { code: "PE", name: "Pernambuco", ibge: "26" },
  { code: "PI", name: "Piauí", ibge: "22" },
  { code: "PR", name: "Paraná", ibge: "41" },
  { code: "RJ", name: "Rio de Janeiro", ibge: "33" },
  { code: "RN", name: "Rio Grande do Norte", ibge: "24" },
  { code: "RO", name: "Rondônia", ibge: "11" },
  { code: "RR", name: "Roraima", ibge: "14" },
  { code: "RS", name: "Rio Grande do Sul", ibge: "43" },
  { code: "SC", name: "Santa Catarina", ibge: "42" },
  { code: "SE", name: "Sergipe", ibge: "28" },
  { code: "SP", name: "São Paulo", ibge: "35" },
  { code: "TO", name: "Tocantins", ibge: "17" },
] as const;

export type UfCode = (typeof UF_LIST)[number]["code"];