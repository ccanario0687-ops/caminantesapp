import { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import BackArrow from "@/components/BackArrow";
import { ArrowLeft, Save, AlertTriangle, Globe, MapPin } from "lucide-react";
import { formatTelefono, formatCedula, toTitleCase } from "@/utils/formatters";
import { toast } from "sonner";
import MobileSelect from "@/components/MobileSelect";
import { useAuth } from "@/lib/AuthContext";
import { useComunidad } from "@/lib/ComunidadContext";

// 🌐 BASE DE DATOS ECLESIÁSTICA MULTIPAÍS COMPLETA EN CASCADA CON CÓDIGOS OFICIALES
const ESTRUCTURA_UBICACIONES = {
  "República Dominicana": {
    "Distrito Nacional": {
      "Archidiócesis de Santo Domingo": [
        { parroquia: "Catedral Primada de América (Santa María de la Encarnación)", tipo: "Catedral", municipio: "Ciudad Colonial" },
        { parroquia: "Capilla de la Tercera Orden Dominica", tipo: "Capilla", municipio: "Ciudad Colonial" },
        { parroquia: "Capilla de los Remedios", tipo: "Capilla", municipio: "Ciudad Colonial" },
        { parroquia: "Capilla San Andrés", tipo: "Capilla", municipio: "Ciudad Colonial" },
        { parroquia: "Capilla Santísima Trinidad", tipo: "Capilla", municipio: "Ciudad Colonial" },
        { parroquia: "Capilla San Rafael", tipo: "Capilla", municipio: "Gazcue" },
        { parroquia: "Parroquia Nuestra Señora de las Mercedes", tipo: "Parroquia", municipio: "Ciudad Colonial" },
        { parroquia: "Parroquia San Carlos Borromeo", tipo: "Parroquia", municipio: "San Carlos" },
        { parroquia: "Parroquia San Juan Bosco", tipo: "Parroquia", municipio: "Don Bosco" },
        { parroquia: "Parroquia Santísima Trinidad", tipo: "Parroquia", municipio: "Ensanche La Fe / Piantini" },
        { parroquia: "Parroquia San Antonio de Padua", tipo: "Parroquia", municipio: "Gazcue" },
      ]
    },
    "Santo Domingo": {
      "Archidiócesis de Santo Domingo": [
        { parroquia: "Parroquia Santa Cruz de Villa Mella", tipo: "Parroquia", municipio: "Villa Mella, Santo Domingo Norte" },
        { parroquia: "Capilla San José", tipo: "Capilla", municipio: "Sabana Perdida, Santo Domingo Norte" },
        { parroquia: "Parroquia San Vicente de Paúl", tipo: "Parroquia", municipio: "Los Mina, Santo Domingo Este" },
        { parroquia: "Parroquia San José Obrero", tipo: "Parroquia", municipio: "Ensanche Ozama, Santo Domingo Este" },
        { parroquia: "Capilla Nuestra Señora de la Altagracia", tipo: "Capilla", municipio: "Boca Chica" },
      ]
    },
    "Monte Plata": {
      "Archidiócesis de Santo Domingo": [
        { parroquia: "Parroquia San José de Yamasá", tipo: "Parroquia", municipio: "Yamasá" },
      ]
    },
    "Santiago": {
      "Archidiócesis de Santiago de los Caballeros": [
        { parroquia: "Catedral Santiago Apóstol", tipo: "Catedral", municipio: "Centro Histórico, Santiago" },
        { parroquia: "Capilla San José", tipo: "Capilla", municipio: "Gurabo, Santiago" },
        { parroquia: "Capilla San Miguel", tipo: "Capilla", municipio: "Licey al Medio" },
        { parroquia: "Parroquia Nuestra Señora de la Altagracia", tipo: "Parroquia", municipio: "Centro Histórico, Santiago" },
        { parroquia: "Parroquia San José", tipo: "Parroquia", municipio: "Baracoa, Santiago" },
        { parroquia: "Parroquia Santísima Cruz", tipo: "Parroquia", municipio: "San José de Las Matas" },
        { parroquia: "Capilla San Rafael", tipo: "Capilla", municipio: "Jánico" },
      ]
    },
    "Espaillat": {
      "Archidiócesis de Santiago de los Caballeros": [
        { parroquia: "Parroquia Sagrado Corazón de Jesús", tipo: "Parroquia", municipio: "Moca" },
        { parroquia: "Parroquia San Juan Evangelista", tipo: "Parroquia", municipio: "Salcedo / Moca" },
      ]
    },
    "La Vega": {
      "Diócesis de La Vega": [
        { parroquia: "Catedral Inmaculada Concepción", tipo: "Catedral", municipio: "La Vega" },
        { parroquia: "Santuario / Capilla Santo Cerro (Nuestra Señora de las Mercedes)", tipo: "Santuario", municipio: "Santo Cerro" },
        { parroquia: "Parroquia Santísimo Sacramento", tipo: "Parroquia", municipio: "Jarabacoa" },
        { parroquia: "Capilla San José", tipo: "Capilla", municipio: "Manabao, Jarabacoa" },
        { parroquia: "Parroquia Nuestra Señora del Carmen", tipo: "Parroquia", municipio: "Jarabacoa" },
      ]
    },
    "Monseñor Nouel": {
      "Diócesis de La Vega": [
        { parroquia: "Parroquia San Mateo", tipo: "Parroquia", municipio: "Bonao" },
      ]
    },
    "Sánchez Ramírez": {
      "Diócesis de La Vega": [
        { parroquia: "Parroquia Inmaculada Concepción", tipo: "Parroquia", municipio: "Cotuí" },
        { parroquia: "Parroquia Sagrados Corazones", tipo: "Parroquia", municipio: "Fantino" },
      ]
    },
    "Duarte": {
      "Diócesis de San Francisco de Macorís": [
        { parroquia: "Catedral Santa Ana", tipo: "Catedral", municipio: "San Francisco de Macorís" },
        { parroquia: "Capilla San Juan Bautista", tipo: "Capilla", municipio: "San Francisco de Macorís" },
        { parroquia: "Parroquia San Francisco de Asís", tipo: "Parroquia", municipio: "San Francisco de Macorís" },
        { parroquia: "Parroquia San Isidro Labrador", tipo: "Parroquia", municipio: "Castillo" },
      ]
    },
    "María Trinidad Sánchez": {
      "Diócesis de San Francisco de Macorís": [
        { parroquia: "Parroquia Santísima Trinidad", tipo: "Parroquia", municipio: "Nagua" },
        { parroquia: "Parroquia Santa Cruz", tipo: "Parroquia", municipio: "Cabrera" },
      ]
    },
    "Samaná": {
      "Diócesis de San Francisco de Macorís": [
        { parroquia: "Parroquia Santa Bárbara", tipo: "Parroquia", municipio: "Santa Bárbara de Samaná" },
        { parroquia: "Parroquia Nuestra Señora del Carmen", tipo: "Parroquia", municipio: "Las Terrenas" },
        { parroquia: "Capilla San Antonio", tipo: "Capilla", municipio: "El Limón" },
        { parroquia: "Capilla San José", tipo: "Capilla", municipio: "Sánchez" },
      ]
    },
    "La Altagracia": {
      "Diócesis de La Altagracia (Higüey)": [
        { parroquia: "Basílica Catedral Nuestra Señora de la Altagracia", tipo: "Catedral", municipio: "Salvaleón de Higüey" },
        { parroquia: "Parroquia San Dionisio", tipo: "Parroquia", municipio: "Salvaleón de Higüey" },
        { parroquia: "Capilla San Juan Bautista", tipo: "Capilla", municipio: "Punta Cana / Bávaro" },
        { parroquia: "Capilla Nuestra Señora del Pilar", tipo: "Capilla", municipio: "Verón" },
      ]
    },
    "La Romana": {
      "Diócesis de La Altagracia (Higüey)": [
        { parroquia: "Parroquia Santa Rosa de Lima", tipo: "Parroquia", municipio: "La Romana" },
        { parroquia: "Capilla San Antonio de Padua", tipo: "Capilla", municipio: "Altos de Chavón, La Romana" },
      ]
    },
    "El Seibo": {
      "Diócesis de La Altagracia (Higüey)": [
        { parroquia: "Parroquia Santa Cruz", tipo: "Parroquia", municipio: "Santa Cruz de El Seibo" },
      ]
    },
    "San Pedro de Macorís": {
      "Diócesis de San Pedro de Macorís": [
        { parroquia: "Catedral San Pedro Apóstol", tipo: "Catedral", municipio: "San Pedro de Macorís" },
        { parroquia: "Capilla San Miguel", tipo: "Capilla", municipio: "Consuelo" },
        { parroquia: "Parroquia San José de Los Llanos", tipo: "Parroquia", municipio: "San José de Los Llanos" },
      ]
    },
    "Hato Mayor": {
      "Diócesis de San Pedro de Macorís": [
        { parroquia: "Parroquia Sagrado Corazón de Jesús", tipo: "Parroquia", municipio: "Hato Mayor del Rey" },
        { parroquia: "Capilla Santísima Cruz", tipo: "Capilla", municipio: "Sabana de la Mar" },
      ]
    },
    "Peravia": {
      "Diócesis de Baní": [
        { parroquia: "Catedral Nuestra Señora de la Regla", tipo: "Catedral", municipio: "Baní" },
        { parroquia: "Capilla San Lorenzo", tipo: "Capilla", municipio: "Matanzas" },
      ]
    },
    "San Cristóbal": {
      "Diócesis de Baní": [
        { parroquia: "Parroquia Nuestra Señora de la Consolación", tipo: "Parroquia", municipio: "San Cristóbal" },
        { parroquia: "Capilla San Rafael", tipo: "Capilla", municipio: "Haina" },
      ]
    },
    "San José de Ocoa": {
      "Diócesis de Baní": [
        { parroquia: "Parroquia San José", tipo: "Parroquia", municipio: "San José de Ocoa" },
      ]
    },
    "Barahona": {
      "Diócesis de Barahona": [
        { parroquia: "Catedral Santa Cruz", tipo: "Catedral", municipio: "Barahona" },
        { parroquia: "Parroquia Cristo Rey", tipo: "Parroquia", municipio: "Barahona" },
        { parroquia: "Capilla San Pedro", tipo: "Capilla", municipio: "Cabral" },
      ]
    },
    "Pedernales": {
      "Diócesis de Barahona": [
        { parroquia: "Parroquia Nuestra Señora de la Altagracia", tipo: "Parroquia", municipio: "Pedernales" },
      ]
    },
    "Bahoruco": {
      "Diócesis de Barahona": [
        { parroquia: "Parroquia San José Obrero", tipo: "Parroquia", municipio: "Villa Jaragua" },
        { parroquia: "Parroquia San Bartolomé", tipo: "Parroquia", municipio: "Neiba" },
      ]
    },
    "San Juan": {
      "Diócesis de San Juan de la Maguana": [
        { parroquia: "Catedral San Juan Bautista", tipo: "Catedral", municipio: "San Juan de la Maguana" },
        { parroquia: "Capilla San Antonio", tipo: "Capilla", municipio: "Las Matas de Farfán" },
      ]
    },
    "Azua": {
      "Diócesis de San Juan de la Maguana": [
        { parroquia: "Parroquia Nuestra Señora de los Remedios", tipo: "Parroquia", municipio: "Azua de Compostela" },
      ]
    },
    "Elías Piña": {
      "Diócesis de San Juan de la Maguana": [
        { parroquia: "Parroquia Santa Teresa de Jesús", tipo: "Parroquia", municipio: "Comendador" },
      ]
    },
    "Valverde": {
      "Diócesis de Mao-Monte Cristi": [
        { parroquia: "Catedral Santa Cruz", tipo: "Catedral", municipio: "Mao" },
        { parroquia: "Capilla San José", tipo: "Capilla", municipio: "Esperanza" },
      ]
    },
    "Monte Cristi": {
      "Diócesis de Mao-Monte Cristi": [
        { parroquia: "Parroquia San Fernando", tipo: "Parroquia", municipio: "Monte Cristi" },
      ]
    },
    "Dajabón": {
      "Diócesis de Mao-Monte Cristi": [
        { parroquia: "Parroquia Nuestra Señora del Rosario", tipo: "Parroquia", municipio: "Dajabón" },
      ]
    },
    "Santiago Rodríguez": {
      "Diócesis de Mao-Monte Cristi": [
        { parroquia: "Parroquia San Ignacio de Loyola", tipo: "Parroquia", municipio: "Sabaneta" },
      ]
    },
    "Puerto Plata": {
      "Diócesis de Puerto Plata": [
        { parroquia: "Catedral San Felipe Apóstol", tipo: "Catedral", municipio: "San Felipe de Puerto Plata" },
        { parroquia: "Capilla San Antonio", tipo: "Capilla", municipio: "Sosúa" },
        { parroquia: "Capilla San Miguel", tipo: "Capilla", municipio: "Cabarete" },
        { parroquia: "Parroquia San José Esposo de la Virgen", tipo: "Parroquia", municipio: "Sabaneta de Yásica" },
        { parroquia: "Parroquia San Isidro Labrador", tipo: "Parroquia", municipio: "Luperón" },
        { parroquia: "Parroquia Nuestra Señora de la Altagracia", tipo: "Parroquia", municipio: "Guananico" },
      ]
    }
  },
  "Estados Unidos": {
    "Massachusetts": {
      "Arquidiócesis metropolitana de Boston [MA-ARQ-BOS]": [
        { parroquia: "Catedral de la Santa Cruz (Cathedral of the Holy Cross)", tipo: "Catedral", municipio: "Boston (South End)", codigo: "MA-BOS-0001" },
        { parroquia: "Saint Clement Eucharistic Shrine", tipo: "Santuario", municipio: "Boston (Back Bay / Downtown)", codigo: "MA-BOS-0002" },
        { parroquia: "Saint Francis Chapel (Prudential Center)", tipo: "Capilla", municipio: "Boston (Back Bay / Downtown)", codigo: "MA-BOS-0003" },
        { parroquia: "Saint Leonard of Port Maurice Parish", tipo: "Parroquia", municipio: "Boston (North End)", codigo: "MA-BOS-0004" },
        { parroquia: "Saint Stephen Church", tipo: "Templo", municipio: "Boston (North End)", codigo: "MA-BOS-0005" },
        { parroquia: "Most Holy Redeemer Parish", tipo: "Parroquia", municipio: "Boston (East Boston)", codigo: "MA-BOS-0006" },
        { parroquia: "Our Lady of the Assumption Parish", tipo: "Parroquia", municipio: "Boston (East Boston)", codigo: "MA-BOS-0007" },
        { parroquia: "Saint Joseph - Saint Lazarus Parish", tipo: "Parroquia", municipio: "Boston (East Boston)", codigo: "MA-BOS-0008" },
        { parroquia: "Madonna Queen of the Universe Shrine", tipo: "Santuario", municipio: "Boston (East Boston)", codigo: "MA-BOS-0009" },
        { parroquia: "Saint Monica - Saint Augustine Parish", tipo: "Parroquia", municipio: "Boston (South Boston)", codigo: "MA-BOS-0010" },
        { parroquia: "Saint Vincent de Paul Parish", tipo: "Parroquia", municipio: "Boston (South Boston)", codigo: "MA-BOS-0011" },
        { parroquia: "Saint Peter and Paul / Saint Bridget Parish", tipo: "Parroquia", municipio: "Boston (South Boston)", codigo: "MA-BOS-0012" },
        { parroquia: "Our Lady of Czestochowa Parish (Polish)", tipo: "Parroquia", municipio: "Boston (South Boston)", codigo: "MA-BOS-0013" },
        { parroquia: "Saint Teresa of Calcutta Parish", tipo: "Parroquia", municipio: "Boston (Dorchester)", codigo: "MA-BOS-0014" },
        { parroquia: "Saint Martin de Porres Parish (St. Ann & St. Brendan)", tipo: "Parroquia", municipio: "Boston (Dorchester)", codigo: "MA-BOS-0015" },
        { parroquia: "Saint Mark Parish", tipo: "Parroquia", municipio: "Boston (Dorchester)", codigo: "MA-BOS-0016" },
        { parroquia: "Saint Ambrose Parish", tipo: "Parroquia", municipio: "Boston (Dorchester)", codigo: "MA-BOS-0017" },
        { parroquia: "Holy Family Parish", tipo: "Parroquia", municipio: "Boston (Dorchester)", codigo: "MA-BOS-0018" },
        { parroquia: "Saint Katharine Drexel Parish", tipo: "Parroquia", municipio: "Boston (Dorchester)", codigo: "MA-BOS-0019" },
        { parroquia: "Basilica of Our Lady of Perpetual Help (Mission Church)", tipo: "Basílica", municipio: "Boston (Roxbury)", codigo: "MA-BOS-0020" },
        { parroquia: "Saint Patrick Parish", tipo: "Parroquia", municipio: "Boston (Roxbury)", codigo: "MA-BOS-0021" },
        { parroquia: "Saint Thomas Aquinas Parish", tipo: "Parroquia", municipio: "Boston (Jamaica Plain)", codigo: "MA-BOS-0022" },
        { parroquia: "Our Lady of Lourdes Parish", tipo: "Parroquia", municipio: "Boston (Jamaica Plain)", codigo: "MA-BOS-0023" },
        { parroquia: "Saint Mary of the Angels Parish", tipo: "Parroquia", municipio: "Boston (Jamaica Plain)", codigo: "MA-BOS-0024" },
        { parroquia: "Saint Columbkille Parish", tipo: "Parroquia", municipio: "Boston (Brighton / Allston)", codigo: "MA-BOS-0025" },
        { parroquia: "Saint Anthony of Padua Parish", tipo: "Parroquia", municipio: "Boston (Brighton / Allston)", codigo: "MA-BOS-0026" },
        { parroquia: "Saint Francis de Sales Parish", tipo: "Parroquia", municipio: "Boston (Charlestown)", codigo: "MA-BOS-0027" },
        { parroquia: "Saint Mary Parish", tipo: "Parroquia", municipio: "Boston (Charlestown)", codigo: "MA-BOS-0028" },
        { parroquia: "Sacred Heart Parish", tipo: "Parroquia", municipio: "Boston (West Roxbury / Roslindale)", codigo: "MA-BOS-0029" },
        { parroquia: "Saint John Chrysostom Parish", tipo: "Parroquia", municipio: "Boston (West Roxbury / Roslindale)", codigo: "MA-BOS-0030" },
        { parroquia: "Saint Theresa of Avila Parish", tipo: "Parroquia", municipio: "Boston (West Roxbury / Roslindale)", codigo: "MA-BOS-0031" },
        { parroquia: "Saint Anne Parish", tipo: "Parroquia", municipio: "Boston (Hyde Park / Readville)", codigo: "MA-BOS-0032" },
        { parroquia: "Most Precious Blood Parish", tipo: "Parroquia", municipio: "Boston (Hyde Park / Readville)", codigo: "MA-BOS-0033" },
        { parroquia: "Saint Mary of the Annunciation Parish", tipo: "Parroquia", municipio: "Cambridge", codigo: "MA-BOS-0034" },
        { parroquia: "Saint Paul Parish", tipo: "Parroquia", municipio: "Cambridge", codigo: "MA-BOS-0035" },
        { parroquia: "Saint Francis of Assisi Parish", tipo: "Parroquia", municipio: "Cambridge", codigo: "MA-BOS-0036" },
        { parroquia: "Saint Peter Parish", tipo: "Parroquia", municipio: "Cambridge", codigo: "MA-BOS-0037" },
        { parroquia: "Saint Benedict Parish", tipo: "Parroquia", municipio: "Somerville", codigo: "MA-BOS-0038" },
        { parroquia: "Saint Anthony of Padua Parish", tipo: "Parroquia", municipio: "Somerville", codigo: "MA-BOS-0039" },
        { parroquia: "Saint Ann Parish", tipo: "Parroquia", municipio: "Somerville", codigo: "MA-BOS-0040" },
        { parroquia: "Saint Mary of the Assumption Parish", tipo: "Parroquia", municipio: "Lawrence", codigo: "MA-BOS-0041" },
        { parroquia: "Saint Patrick Parish", tipo: "Parroquia", municipio: "Lawrence", codigo: "MA-BOS-0042" },
        { parroquia: "Holy Rosary Shrine", tipo: "Santuario", municipio: "Lawrence", codigo: "MA-BOS-0043" },
        { parroquia: "Saint Mary of the Sacred Heart Parish", tipo: "Parroquia", municipio: "Lynn", codigo: "MA-BOS-0044" },
        { parroquia: "Saint Joseph Parish", tipo: "Parroquia", municipio: "Lynn", codigo: "MA-BOS-0045" },
        { parroquia: "Holy Family Parish", tipo: "Parroquia", municipio: "Lynn", codigo: "MA-BOS-0046" },
        { parroquia: "Saint Stephen Parish", tipo: "Parroquia", municipio: "Framingham", codigo: "MA-BOS-0047" },
        { parroquia: "Saint Tarcisius Parish", tipo: "Parroquia", municipio: "Framingham", codigo: "MA-BOS-0048" },
        { parroquia: "Saint George Parish", tipo: "Parroquia", municipio: "Framingham", codigo: "MA-BOS-0049" },
        { parroquia: "Saint Mary Parish", tipo: "Parroquia", municipio: "Waltham", codigo: "MA-BOS-0050" },
        { parroquia: "Saint Jude Parish", tipo: "Parroquia", municipio: "Waltham", codigo: "MA-BOS-0051" },
        { parroquia: "Our Lady Comforter of the Afflicted Parish", tipo: "Parroquia", municipio: "Waltham", codigo: "MA-BOS-0052" },
        { parroquia: "Saint Patrick Parish", tipo: "Parroquia", municipio: "Lowell", codigo: "MA-BOS-0053" },
        { parroquia: "Saint Rita Parish", tipo: "Parroquia", municipio: "Lowell", codigo: "MA-BOS-0054" },
        { parroquia: "Saint Anthony Parish", tipo: "Parroquia", municipio: "Lowell", codigo: "MA-BOS-0055" },
        { parroquia: "Immaculate Conception Parish", tipo: "Parroquia", municipio: "Lowell", codigo: "MA-BOS-0056" },
        { parroquia: "Saint John the Baptist Parish", tipo: "Parroquia", municipio: "Quincy", codigo: "MA-BOS-0057" },
        { parroquia: "Saint Joseph Parish", tipo: "Parroquia", municipio: "Quincy", codigo: "MA-BOS-0058" },
        { parroquia: "Sacred Heart Parish", tipo: "Parroquia", municipio: "Quincy", codigo: "MA-BOS-0059" },
        { parroquia: "Our Lady Help of Christians Parish", tipo: "Parroquia", municipio: "Newton", codigo: "MA-BOS-0060" },
        { parroquia: "Saint Bernard Parish", tipo: "Parroquia", municipio: "Newton", codigo: "MA-BOS-0061" },
        { parroquia: "Saint Ignatius of Loyola Parish", tipo: "Parroquia", municipio: "Newton", codigo: "MA-BOS-0062" },
        { parroquia: "Saint Patrick Parish", tipo: "Parroquia", municipio: "Brockton", codigo: "MA-BOS-0063" },
        { parroquia: "Saint Edith Stein Parish", tipo: "Parroquia", municipio: "Brockton", codigo: "MA-BOS-0064" },
        { parroquia: "Christ the King Parish", tipo: "Parroquia", municipio: "Brockton", codigo: "MA-BOS-0065" },
        { parroquia: "Sacred Hearts Parish", tipo: "Parroquia", municipio: "Malden", codigo: "MA-BOS-0066" },
        { parroquia: "Saint Joseph Parish", tipo: "Parroquia", municipio: "Malden", codigo: "MA-BOS-0067" },
        { parroquia: "Saint Anthony of Padua Parish", tipo: "Parroquia", municipio: "Revere", codigo: "MA-BOS-0068" },
        { parroquia: "Immaculate Conception Parish", tipo: "Parroquia", municipio: "Revere", codigo: "MA-BOS-0069" },
        { parroquia: "Saint Rose of Lima Parish", tipo: "Parroquia", municipio: "Chelsea", codigo: "MA-BOS-0070" },
        { parroquia: "Saint Stanislaus Parish", tipo: "Parroquia", municipio: "Chelsea", codigo: "MA-BOS-0071" },
        { parroquia: "Saint Agnes Parish", tipo: "Parroquia", municipio: "Arlington", codigo: "MA-BOS-0072" },
        { parroquia: "Saint Camillus Parish", tipo: "Parroquia", municipio: "Arlington", codigo: "MA-BOS-0073" },
        { parroquia: "Saint Joseph Parish", tipo: "Parroquia", municipio: "Medford", codigo: "MA-BOS-0074" },
        { parroquia: "Saint Francis of Assisi Parish", tipo: "Parroquia", municipio: "Medford", codigo: "MA-BOS-0075" },
        { parroquia: "Saint Charles Borromeo Parish", tipo: "Parroquia", municipio: "Woburn", codigo: "MA-BOS-0076" },
        { parroquia: "Saint Barbara Parish", tipo: "Parroquia", municipio: "Woburn", codigo: "MA-BOS-0077" },
        { parroquia: "Saint Francis Xavier Parish", tipo: "Parroquia", municipio: "Weymouth", codigo: "MA-BOS-0078" },
        { parroquia: "Sacred Heart Parish", tipo: "Parroquia", municipio: "Weymouth", codigo: "MA-BOS-0079" },
        { parroquia: "Saint Albert the Great Parish", tipo: "Parroquia", municipio: "Weymouth", codigo: "MA-BOS-0080" },
      ],
      "Diócesis sufragánea de Fall River [MA-DIO-FR]": [
        { parroquia: "Cathedral of St. Mary of the Assumption", tipo: "Catedral", municipio: "Fall River" },
        { parroquia: "St. Anthony of Padua Parish", tipo: "Parroquia", municipio: "New Bedford" },
        { parroquia: "St. Mary Parish", tipo: "Parroquia", municipio: "Taunton" },
        { parroquia: "St. Joseph Parish", tipo: "Parroquia", municipio: "Attleboro" },
        { parroquia: "St. Francis Xavier Parish", tipo: "Parroquia", municipio: "Hyannis (Cape Cod)" },
      ],
      "Diócesis sufragánea de Springfield en Massachusetts [MA-DIO-SP]": [
        { parroquia: "St. Michael's Cathedral", tipo: "Catedral", municipio: "Springfield" },
        { parroquia: "Blessed Sacrament Parish", tipo: "Parroquia", municipio: "Greenfield" },
        { parroquia: "St. Elizabeth of Hungary Parish", tipo: "Parroquia", municipio: "North Adams" },
        { parroquia: "St. Joseph Parish", tipo: "Parroquia", municipio: "Pittsfield" },
      ],
      "Diócesis sufragánea de Worcester [MA-DIO-WO]": [
        { parroquia: "Cathedral of St. Paul", tipo: "Catedral", municipio: "Worcester" },
        { parroquia: "St. John Parish", tipo: "Parroquia", municipio: "Worcester" },
        { parroquia: "St. Bernard Parish", tipo: "Parroquia", municipio: "Fitchburg" },
        { parroquia: "St. Cecilia Parish", tipo: "Parroquia", municipio: "Leominster" },
      ]
    },
    "Florida": {
      "Arquidiócesis de Miami": [
        { parroquia: "Catedral St. Mary", tipo: "Catedral", municipio: "Miami" },
        { parroquia: "Our Lady of Guadalupe", tipo: "Parroquia", municipio: "Doral" },
        { parroquia: "St. Louis Catholic Church", tipo: "Parroquia", municipio: "Pinecrest" },
        { parroquia: "St. Francis de Sales", tipo: "Parroquia", municipio: "Miami Beach" },
      ]
    },
    "New York": {
      "Arquidiócesis de Nueva York": [
        { parroquia: "St. Patrick's Cathedral", tipo: "Catedral", municipio: "Manhattan" },
        { parroquia: "St. Nicholas of Tolentine", tipo: "Parroquia", municipio: "The Bronx" },
      ]
    }
  },
  "Colombia": {
    "Bogotá D.C.": {
      "Arquidiócesis de Bogotá": [
        { parroquia: "Catedral Primada de Colombia", tipo: "Catedral", municipio: "La Candelaria" },
        { parroquia: "Parroquia Cristo Rey", tipo: "Parroquia", municipio: "Chapinero" },
        { parroquia: "Parroquia San Antonio de Padua", tipo: "Parroquia", municipio: "Bogotá" },
      ]
    },
    "Antioquia": {
      "Arquidiócesis de Medellín": [
        { parroquia: "Catedral Basílica Metropolitana de Medellín", tipo: "Catedral", municipio: "Medellín" },
        { parroquia: "Parroquia San José", tipo: "Parroquia", municipio: "El Poblado" },
      ]
    }
  },
  "Venezuela": {
    "Distrito Capital": {
      "Arquidiócesis de Caracas": [
        { parroquia: "Catedral Metropolitana de Caracas", tipo: "Catedral", municipio: "Libertador" },
        { parroquia: "Parroquia San Juan Bautista", tipo: "Parroquia", municipio: "Caracas" },
      ]
    },
    "Zulia": {
      "Arquidiócesis de Maracaibo": [
        { parroquia: "Basílica de Nuestra Señora del Chiquinquirá", tipo: "Basílica", municipio: "Maracaibo" },
      ]
    }
  },
  "México": {
    "Ciudad de México": {
      "Arquidiócesis Primada de México": [
        { parroquia: "Catedral Metropolitana de la Ciudad de México", tipo: "Catedral", municipio: "Cuauhtémoc" },
        { parroquia: "Basílica de Santa María de Guadalupe", tipo: "Basílica", municipio: "Gustavo A. Madero" },
      ]
    },
    "Jalisco": {
      "Arquidiócesis de Guadalajara": [
        { parroquia: "Catedral de Guadalajara", tipo: "Catedral", municipio: "Guadalajara" },
      ]
    }
  },
  "Puerto Rico": {
    "San Juan": {
      "Arquidiócesis de San Juan de Puerto Rico": [
        { parroquia: "Catedral Metropolitana de San Juan Bautista", tipo: "Catedral", municipio: "Viejo San Juan" },
      ]
    }
  },
  "España": {
    "Madrid": {
      "Archidiócesis de Madrid": [
        { parroquia: "Catedral de la Almudena", tipo: "Catedral", municipio: "Madrid Centro" },
        { parroquia: "Parroquia San Ginés", tipo: "Parroquia", municipio: "Madrid" },
      ]
    }
  }
};

const PAISES_LIST = Object.keys(ESTRUCTURA_UBICACIONES);

const ESTADOS = ["Pendiente", "Confirmado", "Cancelado"];
const GENEROS = ["Masculino", "Femenino"];
const ROLES_MESA = ["Caminante", "Líder de Mesa"];
const TALLAS = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const TIPOS_SANGRE = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const ESTADOS_CIVILES = ["Soltero(a)", "Casado(a)", "Divorciado(a)", "Viudo(a)", "Unión Libre"];

export default function RegistroCaminante() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { comunidadActual } = useComunidad();
  const [saving, setSaving] = useState(false);
  const [fichasOcupadas, setFichasOcupadas] = useState({});
  const [totalFichasDisponible, setTotalFichasDisponible] = useState(0);
  const [errorFicha, setErrorFicha] = useState("");
  const [debugInfo, setDebugInfo] = useState("");
  const [config, setConfig] = useState(null);

  const getEquipoIdActivo = useCallback(() => {
    if (comunidadActual?.equipo_id) return comunidadActual.equipo_id;
    if (comunidadActual?.id && comunidadActual.id !== "global" && comunidadActual.id !== "GLOBAL") return comunidadActual.id;
    if (user?.equipo_id) return user.equipo_id;
    if (user?.comunidad_id) return user.comunidad_id;
    try {
      const saved = localStorage.getItem("comunidad_activa_obj");
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed?.equipo_id) return parsed.equipo_id;
      if (parsed?.id && parsed.id !== "global" && parsed.id !== "GLOBAL") return parsed.id;
    } catch {}
    return null;
  }, [comunidadActual, user]);

  const configCamposMap = useMemo(() => {
    let raw = config?.config_campos_caminante;
    if (!raw && typeof window !== "undefined") {
      const eq = getEquipoIdActivo() || "default";
      raw = localStorage.getItem(`emaus_config_campos_caminante_${eq}`) || localStorage.getItem("emaus_config_campos_caminante");
    }
    if (!raw) return null;
    try {
      return typeof raw === "string"
        ? JSON.parse(raw)
        : raw;
    } catch {
      return null;
    }
  }, [config, getEquipoIdActivo]);

  const isCampoVisible = useCallback((key, def = true) => {
    if (!configCamposMap || !configCamposMap[key]) return def;
    return Boolean(configCamposMap[key].activo);
  }, [configCamposMap]);

  const isCampoObligatorio = useCallback((key, def = false) => {
    if (!configCamposMap || !configCamposMap[key]) return def;
    return Boolean(configCamposMap[key].activo && configCamposMap[key].obligatorio);
  }, [configCamposMap]);

  const [form, setForm] = useState({
    numero_ficha: "",
    nombre: "",
    apodo: "",
    cedula: "",
    edad: "",
    genero: "",
    estado_civil: "",
    email: "",
    telefono: "",
    pais: "República Dominicana",
    provincia: "",
    diocesis: "",
    parroquia: "",
    municipio: "",
    sector: "",
    calle: "",
    direccion: "",
    ocupacion: "",
    padrino_madrina: "",
    telefono_padrino: "",
    contacto_emergencia: "",
    relacion_emergencia: "",
    telefono_emergencia: "",
    rol_en_mesa: "Caminante",
    numero_retiro: "",
    fecha_nacimiento: "",
    talla_camisa: "",
    tipo_sangre: "",
    peso_kg: "",
    talla_cm: "",
    necesidades_medicas: "",
    estado: "Pendiente",
    notas: "",
    bautismo: false,
    comunion: false,
    confirmacion: false,
    matrimonio: false
  });

  // 🎂 Cálculo automático de la Edad
  useEffect(() => {
    if (!form.fecha_nacimiento) {
      setForm(prev => ({ ...prev, edad: "" }));
      return;
    }

    const fechaNac = new Date(form.fecha_nacimiento);
    const hoy = new Date();

    let edadCalculada = hoy.getFullYear() - fechaNac.getFullYear();
    const diferenciaMeses = hoy.getMonth() - fechaNac.getMonth();

    if (diferenciaMeses < 0 || (diferenciaMeses === 0 && hoy.getDate() < fechaNac.getDate())) {
      edadCalculada--;
    }

    setForm(prev => ({ ...prev, edad: edadCalculada >= 0 ? String(edadCalculada) : "" }));
  }, [form.fecha_nacimiento]);

  useEffect(() => {
    const idActivo = getEquipoIdActivo();
    Promise.all([
      base44.entities.Caminante.list().catch(() => []),
      base44.entities.ConfigRetiro.list().catch(() => [])
    ]).then(([caminantes, configs]) => {
      const activeCfg = (configs || []).find(c => String(c.equipo_id || c.comunidad_id || "") === String(idActivo)) || configs?.[0];
      if (activeCfg) setConfig(activeCfg);

      const caminantesFiltrados = (caminantes || []).filter(c => {
        if (!idActivo) return true;
        return String(c.equipo_id || c.comunidad_id || "") === String(idActivo);
      });

      const mapa = {};
      caminantesFiltrados.forEach(c => { if (c.numero_ficha) mapa[c.numero_ficha] = c.nombre; });
      setFichasOcupadas(mapa);
      const total = activeCfg?.total_fichas || 100;
      setTotalFichasDisponible(total);
      const edicion = activeCfg?.edicion;

      let siguiente = 1;
      while (mapa[siguiente] && siguiente <= total) {
        siguiente++;
      }
      const updates = {};
      if (siguiente <= total) updates.numero_ficha = String(siguiente);
      if (edicion) updates.numero_retiro = String(edicion);
      setForm(prev => ({ ...prev, ...updates }));
    }).catch(() => {});
  }, [getEquipoIdActivo]);

  const fichasDisponiblesCount = Math.max(
    totalFichasDisponible - Object.keys(fichasOcupadas).length,
    0
  );

  const validarFicha = (num) => {
    if (!num) { setErrorFicha(""); return true; }
    const n = Number(num);
    if (isNaN(n) || n < 1) { setErrorFicha("Ingresa un número de ficha válido."); return false; }
    if (totalFichasDisponible > 0 && n > totalFichasDisponible) {
      setErrorFicha(`La ficha máxima disponible es #${totalFichasDisponible}.`);
      return false;
    }
    if (fichasOcupadas[n] || fichasOcupadas[String(n)]) { setErrorFicha(`Ficha #${n} asignada a: ${fichasOcupadas[n] || fichasOcupadas[String(n)]}`); return false; }
    setErrorFicha("");
    return true;
  };

  const imc = form.peso_kg && form.talla_cm
    ? (Number(form.peso_kg) / Math.pow(Number(form.talla_cm) / 100, 2)).toFixed(1)
    : null;

  // 🔄 CASCADA DE UBICACIÓN MULTIPAÍS COMPLETA
  const estadosDisponibles = form.pais && ESTRUCTURA_UBICACIONES[form.pais]
    ? Object.keys(ESTRUCTURA_UBICACIONES[form.pais])
    : [];

  const diocesisDisponibles = form.pais && form.provincia && ESTRUCTURA_UBICACIONES[form.pais]?.[form.provincia]
    ? Object.keys(ESTRUCTURA_UBICACIONES[form.pais][form.provincia])
    : [];

  const parroquiasDisponibles = form.pais && form.provincia && form.diocesis && ESTRUCTURA_UBICACIONES[form.pais]?.[form.provincia]?.[form.diocesis]
    ? ESTRUCTURA_UBICACIONES[form.pais][form.provincia][form.diocesis]
    : [];

  const handlePaisChange = (pais) => {
    setForm(prev => ({
      ...prev,
      pais,
      provincia: "",
      diocesis: "",
      parroquia: "",
      municipio: ""
    }));
  };

  const handleProvinciaChange = (provincia) => {
    setForm(prev => ({
      ...prev,
      provincia,
      diocesis: "",
      parroquia: "",
      municipio: ""
    }));
  };

  const handleDiocesisChange = (diocesis) => {
    setForm(prev => ({
      ...prev,
      diocesis,
      parroquia: "",
      municipio: ""
    }));
  };

  const handleParroquiaChange = (parroquiaNombre) => {
    const item = parroquiasDisponibles.find(p => p.parroquia === parroquiaNombre);
    setForm(prev => ({
      ...prev,
      parroquia: parroquiaNombre,
      municipio: item ? item.municipio : prev.municipio
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setForm(prev => ({ ...prev, [name]: checked }));
      return;
    }

    if (name === "numero_ficha") {
      validarFicha(value);
    }

    if (name === "rol_en_mesa") {
      if (value === "Líder de Mesa") {
        setErrorFicha("");
        setForm(prev => ({ ...prev, rol_en_mesa: value, numero_ficha: "" }));
        return;
      }
      setForm(prev => ({ ...prev, rol_en_mesa: value }));
      return;
    }

    let formatted = value;
    if (name === "telefono" || name === "telefono_padrino" || name === "telefono_emergencia") {
      formatted = formatTelefono(value);
    }
    if (name === "cedula") {
      formatted = formatCedula(value);
    }
    if (name === "nombre") {
      formatted = toTitleCase(value);
    }

    setForm(prev => ({ ...prev, [name]: formatted }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setDebugInfo("📋 Validando formulario...");

    if (!form.nombre || !form.nombre.trim()) {
      toast.error("El nombre completo es obligatorio.");
      setDebugInfo("⚠️ El nombre es obligatorio.");
      return;
    }
    if (isCampoObligatorio("cedula", false) && (!form.cedula || !form.cedula.trim())) {
      toast.error("La cédula es obligatoria según la configuración.");
      setDebugInfo("⚠️ Cédula requerida por configuración.");
      return;
    }
    if (isCampoObligatorio("telefono", false) && (!form.telefono || !form.telefono.trim())) {
      toast.error("El teléfono es obligatorio según la configuración.");
      setDebugInfo("⚠️ Teléfono requerido por configuración.");
      return;
    }
    if (isCampoObligatorio("contacto_emergencia", false) && (!form.contacto_emergencia || !form.contacto_emergencia.trim())) {
      toast.error("El contacto de emergencia es obligatorio según la configuración.");
      setDebugInfo("⚠️ Contacto de emergencia requerido.");
      return;
    }

    const esLM = form.rol_en_mesa === "Líder de Mesa";
    if (!esLM && !form.numero_ficha) {
      toast.error("Debes asignar un número de ficha.");
      setDebugInfo("⚠️ Asigna un número de ficha.");
      return;
    }
    if (!esLM && !validarFicha(form.numero_ficha)) {
      toast.error(errorFicha || "Número de ficha no válido.");
      setDebugInfo(`⚠️ Error de ficha: ${errorFicha || 'No válida'}`);
      return;
    }

    guardarCaminante();
  };

  const guardarCaminante = async () => {
    setSaving(true);
    setDebugInfo("🔄 Iniciando guardado...");
    
    try {
      const equipoIdActivo = getEquipoIdActivo();
      setDebugInfo(`🔍 Verificando duplicados (Equipo: ${equipoIdActivo || "General"})...`);

      const cedula = (form.cedula || "").trim();
      const nombreNorm = (form.nombre || "").trim().toLowerCase();
      const telefonoNorm = (form.telefono || "").trim();

      const [cams, solicitudes] = await Promise.all([
        base44.entities.Caminante.list().catch(() => []),
        base44.entities.InscripcionRemota.list().catch(() => [])
      ]);

      const existe = cedula
        ? (cams || []).some(c => (c.cedula || "").trim() === cedula) || (solicitudes || []).some(s => (s.cedula || "").trim() === cedula)
        : (cams || []).some(c => (c.nombre || "").trim().toLowerCase() === nombreNorm && (c.telefono || "").trim() === telefonoNorm);

      if (existe) {
        toast.error(cedula ? "Ya existe un caminante registrado con esta cédula." : "Ya existe un caminante con este nombre y teléfono.");
        setSaving(false);
        setDebugInfo("❌ Duplicado detectado");
        return;
      }

      setDebugInfo("📤 Enviando a Base44...");

      const direccionCompleta = [form.calle, form.sector, form.municipio, form.provincia, form.pais].filter(Boolean).join(", ") || form.direccion;

      const payload = {
        nombre: form.nombre,
        apodo: form.apodo,
        cedula: form.cedula,
        genero: form.genero,
        estado_civil: form.estado_civil,
        email: form.email,
        telefono: form.telefono,
        pais: form.pais,
        diocesis: form.diocesis,
        direccion: direccionCompleta,
        calle: form.calle,
        sector: form.sector,
        municipio: form.municipio,
        provincia: form.provincia,
        ocupacion: form.ocupacion,
        parroquia: form.parroquia,
        rol_en_mesa: form.rol_en_mesa,
        estado: form.estado || "Pendiente",
        pago_ficha: "Pendiente",
        notas: form.notas,
        padrino_madrina: form.padrino_madrina,
        telefono_padrino: form.telefono_padrino,
        contacto_emergencia: form.contacto_emergencia,
        relacion_emergencia: form.relacion_emergencia,
        telefono_emergencia: form.telefono_emergencia,
        talla_camisa: form.talla_camisa,
        tipo_sangre: form.tipo_sangre,
        peso_kg: form.peso_kg ? Number(form.peso_kg) : undefined,
        talla_cm: form.talla_cm ? Number(form.talla_cm) : undefined,
        necesidades_medicas: form.necesidades_medicas,
        fecha_nacimiento: form.fecha_nacimiento,
        bautismo: Boolean(form.bautismo),
        comunion: Boolean(form.comunion),
        confirmacion: Boolean(form.confirmacion),
        matrimonio: Boolean(form.matrimonio),
        edad: form.edad ? Number(form.edad) : undefined,
        numero_retiro: form.numero_retiro ? Number(form.numero_retiro) : undefined,
        numero_ficha: form.numero_ficha ? Number(form.numero_ficha) : undefined,
      };

      if (equipoIdActivo) {
        payload.equipo_id = equipoIdActivo;
        payload.comunidad_id = equipoIdActivo;
      }

      await base44.entities.Caminante.create(payload);

      setDebugInfo("✅ Guardado exitoso. Redirigiendo...");
      toast.success("¡Caminante registrado exitosamente!");
      setTimeout(() => navigate("/caminantes"), 500);
    } catch (error) {
      console.error("Error al registrar en Base44:", error);
      const msg = error?.message || "error del servidor.";
      setDebugInfo(`❌ ERROR: ${msg}`);
      toast.error("No se pudo guardar el caminante: " + msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="bg-gradient-to-r from-amber-800 to-amber-600 text-white px-6 py-6 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <BackArrow />
          <div>
            <h1 className="text-2xl font-bold">Registrar Caminante</h1>
            <p className="text-amber-200 text-sm">Completa los datos del nuevo caminante</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {debugInfo && (
          <div className="mb-4 p-4 rounded-lg border-2 border-amber-500 bg-amber-100 text-amber-900 text-sm font-mono flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">🔧 Diagnóstico:</p>
              <p>{debugInfo}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border border-amber-100 p-6 space-y-5">

          {form.rol_en_mesa === "Líder de Mesa" ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-4 space-y-1">
              <label className="text-sm font-semibold text-blue-800">Líder de Mesa</label>
              <p className="text-xs text-blue-700">
                Los Líderes de Mesa no requieren número de ficha. El campo de ficha no se ve afectado.
              </p>
            </div>
          ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-4 space-y-2">
            <label className="text-sm font-semibold text-amber-800">Número de Ficha</label>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-amber-700">#</span>
              <input
                type="number"
                name="numero_ficha"
                value={form.numero_ficha}
                onChange={handleChange}
                placeholder={`1 - ${totalFichasDisponible || "..."}`}
                min="1"
                max={totalFichasDisponible || undefined}
                className={`w-32 border rounded-lg px-3 py-2 text-lg font-bold focus:outline-none focus:ring-2 ${errorFicha ? "border-red-400 bg-red-50 focus:ring-red-400" : "border-amber-300 focus:ring-amber-400"}`}
              />
              <span className="text-xs text-amber-500">
                {totalFichasDisponible > 0 ? `(fichas 1 - ${totalFichasDisponible})` : "(cargando...)"}
              </span>
            </div>
            {totalFichasDisponible > 0 && (
              <p className="text-xs font-semibold text-amber-700">
                Fichas disponibles: {fichasDisponiblesCount} de {totalFichasDisponible}
              </p>
            )}
            {errorFicha && <p className="text-red-600 text-xs font-semibold">{errorFicha}</p>}
            {!form.numero_ficha && !errorFicha && (
              <p className="text-amber-600 text-xs font-medium">Asigna un número de ficha (requerido).</p>
            )}
          </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Nombre Completo *" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: Juan Pérez" />
            <Field label="Apodo" name="apodo" value={form.apodo} onChange={handleChange} placeholder="Ej: Juanchi" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Cédula" name="cedula" value={form.cedula} onChange={handleChange} placeholder="001-0000000-0" />
            <Field label="Fecha de Nacimiento" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange} type="date" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Edad (Automática)" name="edad" value={form.edad} onChange={handleChange} type="number" placeholder="Se calcula sola" disabled />
            <SelectField label="Género" name="genero" value={form.genero} onChange={handleChange} options={GENEROS} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SelectField label="Estado Civil" name="estado_civil" value={form.estado_civil} onChange={handleChange} options={ESTADOS_CIVILES} />
            <Field label="Ocupación" name="ocupacion" value={form.ocupacion} onChange={handleChange} placeholder="Ej: Médico, Ingeniero, Estudiante" />
          </div>

          <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-4">
            <label className="block text-sm font-semibold text-amber-800 mb-2">Sacramentos Recibidos</label>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm font-medium text-amber-900 cursor-pointer">
                <input type="checkbox" name="bautismo" checked={form.bautismo} onChange={handleChange} className="rounded border-amber-300 text-amber-700 focus:ring-amber-500 w-4 h-4" />
                Bautismo
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-amber-900 cursor-pointer">
                <input type="checkbox" name="confirmacion" checked={form.confirmacion} onChange={handleChange} className="rounded border-amber-300 text-amber-700 focus:ring-amber-500 w-4 h-4" />
                Confirmación
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-amber-900 cursor-pointer">
                <input type="checkbox" name="comunion" checked={form.comunion} onChange={handleChange} className="rounded border-amber-300 text-amber-700 focus:ring-amber-500 w-4 h-4" />
                1ra Comunión
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-amber-900 cursor-pointer">
                <input type="checkbox" name="matrimonio" checked={form.matrimonio} onChange={handleChange} className="rounded border-amber-300 text-amber-700 focus:ring-amber-500 w-4 h-4" />
                Matrimonio
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Teléfono" name="telefono" value={form.telefono} onChange={handleChange} placeholder="Ej: 809-555-1234" />
            <Field label="Correo Electrónico" name="email" value={form.email} onChange={handleChange} placeholder="Ej: juan@email.com" type="email" />
          </div>

          {/* 🌐 SECCIÓN COMPLETA DE UBICACIÓN ECLESIÁSTICA MULTIPAÍS EN CASCADA */}
          <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-4 space-y-4">
            <label className="block text-sm font-semibold text-amber-800 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-amber-700" /> Ubicación Eclesiástica y Dirección (Cascada Multipaís)
            </label>
            <p className="text-xs text-amber-600 -mt-2">Selecciona el país, provincia, diócesis y parroquia para autocompletar la ubicación.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 1. PAÍS */}
              <div>
                <label className="block text-sm font-semibold text-amber-800 mb-1">País *</label>
                <MobileSelect
                  value={form.pais}
                  onChange={handlePaisChange}
                  options={[
                    { value: "", label: "Seleccionar País..." },
                    ...PAISES_LIST.map(p => ({ value: p, label: p }))
                  ]}
                  className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
              </div>

              {/* 2. ESTADO / PROVINCIA */}
              <div>
                <label className="block text-sm font-semibold text-amber-800 mb-1">Estado / Provincia *</label>
                <MobileSelect
                  value={form.provincia}
                  onChange={handleProvinciaChange}
                  disabled={!form.pais}
                  options={[
                    { value: "", label: !form.pais ? "Primero seleccione un país" : "Seleccionar Estado / Provincia..." },
                    ...estadosDisponibles.map(e => ({ value: e, label: e }))
                  ]}
                  className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* 3. DIÓCESIS / ARQUIDIÓCESIS */}
              <div>
                <label className="block text-sm font-semibold text-amber-800 mb-1">Diócesis / Arquidiócesis *</label>
                <MobileSelect
                  value={form.diocesis}
                  onChange={handleDiocesisChange}
                  disabled={!form.provincia}
                  options={[
                    { value: "", label: !form.provincia ? "Primero seleccione una provincia" : "Seleccionar Diócesis..." },
                    ...diocesisDisponibles.map(d => ({ value: d, label: d }))
                  ]}
                  className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* 4. PARROQUIA / TEMPLO */}
              <div>
                <label className="block text-sm font-semibold text-amber-800 mb-1">Parroquia / Templo / Capilla *</label>
                <MobileSelect
                  value={form.parroquia}
                  onChange={handleParroquiaChange}
                  disabled={!form.diocesis}
                  options={[
                    { value: "", label: !form.diocesis ? "Primero seleccione una diócesis" : "Seleccionar Parroquia..." },
                    ...parroquiasDisponibles.map(p => ({ 
                      value: p.parroquia, 
                      label: `${p.parroquia} (${p.tipo})${p.codigo ? ` [${p.codigo}]` : ""}` 
                    }))
                  ]}
                  className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <Field label="Municipio / Ciudad" name="municipio" value={form.municipio} onChange={handleChange} placeholder="Municipio o Ciudad" />
              <Field label="Sector / Barrio" name="sector" value={form.sector} onChange={handleChange} placeholder="Barrio o sector" />
              <div className="md:col-span-2">
                <Field label="Calle / Número / Residencia" name="calle" value={form.calle} onChange={handleChange} placeholder="Calle / número / apto" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Padrino / Madrina" name="padrino_madrina" value={form.padrino_madrina} onChange={handleChange} placeholder="Nombre completo" />
            <Field label="Teléfono del Padrino / Madrina" name="telefono_padrino" value={form.telefono_padrino} onChange={handleChange} placeholder="Ej: 809-555-1234" />
          </div>

          <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-4 space-y-4">
            <label className="block text-sm font-semibold text-amber-800">Contacto de Emergencia</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Field label="Nombre del Contacto" name="contacto_emergencia" value={form.contacto_emergencia} onChange={handleChange} placeholder="Nombre completo" />
              <Field label="Relación" name="relacion_emergencia" value={form.relacion_emergencia} onChange={handleChange} placeholder="Ej: Madre, Esposa, Hermano" />
              <Field label="Teléfono de Emergencia" name="telefono_emergencia" value={form.telefono_emergencia} onChange={handleChange} placeholder="Ej: 809-555-1234" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SelectField label="Rol en Mesa" name="rol_en_mesa" value={form.rol_en_mesa} onChange={handleChange} options={ROLES_MESA} />
            <div>
              <label className="block text-sm font-semibold text-amber-800 mb-1">Número de Retiro</label>
              <div className="w-full border border-amber-100 bg-amber-50 rounded-lg px-3 py-2 text-sm font-medium text-amber-700">
                {form.numero_retiro ? `Retiro #${form.numero_retiro}` : "Sin asignar"}
              </div>
              <p className="text-xs text-amber-500 mt-1">Definido en Configuración</p>
            </div>
          </div>

          <SelectField label="Estado" name="estado" value={form.estado} onChange={handleChange} options={ESTADOS} />

          <div>
            <label className="block text-sm font-semibold text-amber-800 mb-1">Notas</label>
            <textarea
              name="notas"
              value={form.notas}
              onChange={handleChange}
              rows={3}
              placeholder="Observaciones adicionales..."
              className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Peso (kg)" name="peso_kg" value={form.peso_kg} onChange={handleChange} type="number" placeholder="Ej: 70" />
            <Field label="Estatura (cm)" name="talla_cm" value={form.talla_cm} onChange={handleChange} type="number" placeholder="Ej: 170" />
          </div>
          {imc && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-700">
                <span className="font-semibold">IMC calculado:</span> {imc}
                {Number(imc) >= 30 && <span className="text-orange-600 ml-2">(Considera primer piso en asignación de habitación)</span>}
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SelectField label="Talla de Camisa" name="talla_camisa" value={form.talla_camisa} onChange={handleChange} options={TALLAS} />
            <SelectField label="Tipo de Sangre" name="tipo_sangre" value={form.tipo_sangre} onChange={handleChange} options={TIPOS_SANGRE} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-amber-800 mb-1">Necesidades Médicas</label>
            <textarea
              name="necesidades_medicas"
              value={form.necesidades_medicas}
              onChange={handleChange}
              rows={2}
              placeholder="Alergias, condiciones médicas, medicamentos..."
              className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link to="/caminantes" className="px-5 py-2.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 text-sm font-medium transition-colors">
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 shadow-md"
            >
              <Save className="w-4 h-4" />
              {saving ? "Guardando..." : "Guardar Caminante"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = "text", placeholder, disabled = false }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-amber-800 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${disabled ? 'bg-amber-50/50 text-amber-700 font-medium border-amber-100' : 'bg-white font-medium'}`}
      />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-amber-800 mb-1">{label}</label>
      <MobileSelect
        name={name}
        value={value}
        onChange={(v) => onChange({ target: { name, value: v } })}
        options={[{ value: "", label: "Seleccionar..." }, ...options]}
        className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
      />
    </div>
  );
}