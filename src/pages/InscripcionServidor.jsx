import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Heart, Loader2, X, Check, FileText, MessageCircle, Globe, MapPin } from "lucide-react";
import { formatCedula, toTitleCase } from "@/utils/formatters";
import MobileSelect from "@/components/MobileSelect";

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

const EMPTY = {
  nombre: "", apodo: "", cedula: "", fecha_nacimiento: "", edad: "", genero: "", estado_civil: "", email: "", telefono: "",
  pais: "República Dominicana", provincia: "", diocesis: "", parroquia: "", municipio: "", sector: "", calle: "", direccion: "",
  lugares_servido: "", necesidades_medicas: "", condicion_fisica: "Ninguna",
  contacto_emergencia: "", relacion_emergencia: "", telefono_emergencia: "",
  rol_en_mesa: "Servidor",
};

const inp = "w-full border border-blue-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white font-medium";
const lbl = "block text-sm font-semibold text-blue-900 mb-1";

// 📞 MÁSCARA AUTOMÁTICA DE TELÉFONO
const formatTelefono = (value) => {
  if (!value) return "";
  const num = value.replace(/\D/g, "").slice(0, 10);
  if (num.length <= 3) return num;
  if (num.length <= 6) return `${num.slice(0, 3)}-${num.slice(3)}`;
  return `${num.slice(0, 3)}-${num.slice(3, 6)}-${num.slice(6, 10)}`;
};

// 🎂 CÁLCULO AUTOMÁTICO DE EDAD SEGÚN FECHA DE NACIMIENTO
const calcularEdad = (fechaNacStr) => {
  if (!fechaNacStr) return "";
  const hoy = new Date();
  const nac = new Date(fechaNacStr);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) {
    edad--;
  }
  return edad >= 0 ? edad : "";
};

export default function InscripcionServidor() {
  const { comunidadId, slug } = useParams();
  const [searchParams] = useSearchParams();
  
  // 🔑 CAPTURA DE CÓDIGO ÚNICO Y PARÁMETROS DE URL
  const codigoComunidadParam = searchParams.get("codigo_comunidad") || searchParams.get("codigo");
  const retiroId = comunidadId || slug || searchParams.get("retiro_id") || searchParams.get("comunidad_id") || searchParams.get("equipo_id") || searchParams.get("t");
  const comunidadNombreParam = searchParams.get("comunidad_nombre") || searchParams.get("comunidad");

  const [form, setForm] = useState(EMPTY);
  const [config, setConfig] = useState(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState({});
  const [errorEnvio, setErrorEnvio] = useState(null);
  const [nombreEnviado, setNombreEnviado] = useState("");

  // 🏥 ESTADO PARA COTEJO SÍ / NO Y MODAL DE SALUD
  const [tieneNecesidadMedica, setTieneNecesidadMedica] = useState("NO");
  const [modalMedicaOpen, setModalMedicaOpen] = useState(false);
  const [textoMedicoTemp, setTextoMedicoTemp] = useState("");

  // 🧬 CARGAR CONFIGURACIÓN Y SINCRONIZAR PAÍS / GÉNERO
  useEffect(() => {
    Promise.all([
      base44.entities.ConfigRetiro.list().catch(() => []),
      base44.functions.invoke("inscripcionPublica", { getConfig: true, retiro_id: retiroId, codigo_comunidad: codigoComunidadParam }).catch(() => null),
    ]).then(([cfgs, resCloud]) => {
      let match = null;
      if ((retiroId || codigoComunidadParam) && cfgs && cfgs.length > 0) {
        match = cfgs.find(c => 
          (codigoComunidadParam && (c.codigo_comunidad === codigoComunidadParam || c.codigo === codigoComunidadParam)) ||
          c.equipo_id === retiroId || 
          c.comunidad_id === retiroId || 
          c.retiro_id === retiroId ||
          c.slug === retiroId ||
          c.id === retiroId
        );
      }
      if (!match && resCloud?.data?.config) match = resCloud.data.config;
      if (!match && cfgs && cfgs.length > 0) match = cfgs[0];
      if (match) {
        setConfig(match);
        setForm(f => ({
          ...f,
          pais: match.pais || match.pais_defecto || f.pais || "República Dominicana",
          ...(match.tipo_retiro === "Retiro Hombres" ? { genero: "Masculino" } : {}),
          ...(match.tipo_retiro === "Retiro Mujeres" ? { genero: "Femenino" } : {})
        }));
      }
    });
  }, [retiroId, codigoComunidadParam]);

  const nombreComunidadReal = comunidadNombreParam 
    ? decodeURIComponent(comunidadNombreParam)
    : config?.parroquia || config?.nombre_equipo || (retiroId && retiroId !== "general" ? toTitleCase(decodeURIComponent(retiroId).replace(/-/g, ' ')) : null);

  const nombreRetiro = nombreComunidadReal
    ? `Retiro de Emaús — ${nombreComunidadReal}`
    : (config?.nombre_retiro || "Retiro de Emaús");

  const eslogan = config?.eslogan || "Lucas 24, 13-35";
  const generoFijo = config?.tipo_retiro === "Retiro Hombres" ? "Masculino"
    : config?.tipo_retiro === "Retiro Mujeres" ? "Femenino" : null;

  // 📋 PARSEO DINÁMICO DE CAMPOS PERSONALIZADOS DESDE CONFIGURACIÓN
  const configCamposMap = useMemo(() => {
    let raw = config?.config_campos_servidor;
    if (!raw && typeof window !== "undefined") {
      raw = localStorage.getItem(`emaus_config_campos_servidor_${retiroId}`) || localStorage.getItem("emaus_config_campos_servidor");
    }
    if (!raw) return null;
    try {
      return typeof raw === "string"
        ? JSON.parse(raw)
        : raw;
    } catch {
      return null;
    }
  }, [config, retiroId]);

  const isCampoVisible = useCallback((key, def = true) => {
    if (!configCamposMap || !configCamposMap[key]) return def;
    return Boolean(configCamposMap[key].activo);
  }, [configCamposMap]);

  const isCampoObligatorio = useCallback((key, def = false) => {
    if (!configCamposMap || !configCamposMap[key]) return def;
    return Boolean(configCamposMap[key].activo && configCamposMap[key].obligatorio);
  }, [configCamposMap]);

  const set = (k, v) => {
    let val = v;
    if (k === "cedula") val = formatCedula(v);
    if (k === "nombre") val = toTitleCase(v);
    if (k === "telefono" || k === "telefono_emergencia") val = formatTelefono(v);
    
    setForm(f => {
      const nuevo = { ...f, [k]: val };
      if (k === "fecha_nacimiento") {
        nuevo.edad = calcularEdad(val);
      }
      return nuevo;
    });
    setErrores(e => ({ ...e, [k]: undefined }));
  };

  // 🔄 CASCADA: LISTA DE ESTADOS / PROVINCIAS SEGÚN EL PAÍS SELECCIONADO
  const estadosDisponibles = form.pais && ESTRUCTURA_UBICACIONES[form.pais]
    ? Object.keys(ESTRUCTURA_UBICACIONES[form.pais])
    : [];

  // 🔄 CASCADA: LISTA DE DIÓCESIS SEGÚN PAÍS Y ESTADO
  const diocesisDisponibles = form.pais && form.provincia && ESTRUCTURA_UBICACIONES[form.pais]?.[form.provincia]
    ? Object.keys(ESTRUCTURA_UBICACIONES[form.pais][form.provincia])
    : [];

  // 🔄 CASCADA: LISTA DE PARROQUIAS SEGÚN DIÓCESIS
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

  // 🏥 MANEJO DEL COTEJO SÍ / NO
  const abrirModalSalud = (opcion) => {
    setTieneNecesidadMedica(opcion);
    if (opcion === "SI") {
      setTextoMedicoTemp(form.necesidades_medicas || "");
      setModalMedicaOpen(true);
    } else {
      setForm(f => ({ ...f, necesidades_medicas: "" }));
    }
  };

  const guardarSaludModal = () => {
    setForm(f => ({ ...f, necesidades_medicas: textoMedicoTemp }));
    setModalMedicaOpen(false);
  };

  const validar = () => {
    const e = {};
    if (isCampoObligatorio("nombre", true) && !form.nombre.trim()) e.nombre = "Requerido";
    if (isCampoObligatorio("cedula", true) && !form.cedula.trim()) e.cedula = "Requerido";
    if (isCampoObligatorio("fecha_nacimiento", true) && !form.fecha_nacimiento) e.fecha_nacimiento = "Requerido";
    if (isCampoObligatorio("genero", true) && !generoFijo && !form.genero) e.genero = "Requerido";
    if (isCampoObligatorio("telefono", true) && !form.telefono.trim()) e.telefono = "Requerido";
    if (isCampoObligatorio("pais", true) && !form.pais.trim()) e.pais = "Requerido";
    if (isCampoObligatorio("provincia", true) && !form.provincia.trim()) e.provincia = "Requerido";
    if (isCampoObligatorio("diocesis", true) && !form.diocesis.trim()) e.diocesis = "Requerido";
    if (isCampoObligatorio("parroquia", true) && !form.parroquia.trim()) e.parroquia = "Requerido";
    if (isCampoObligatorio("contacto_emergencia", true) && !form.contacto_emergencia.trim()) e.contacto_emergencia = "Requerido";
    if (isCampoObligatorio("apodo", false) && !form.apodo.trim()) e.apodo = "Requerido";
    if (isCampoObligatorio("estado_civil", false) && !form.estado_civil.trim()) e.estado_civil = "Requerido";
    if (isCampoObligatorio("telefono_emergencia", false) && !form.telefono_emergencia.trim()) e.telefono_emergencia = "Requerido";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorEnvio(null);
    const errs = validar();
    if (Object.keys(errs).length > 0) { 
      setErrores(errs); 
      return; 
    }
    
    setEnviando(true);
    setNombreEnviado(form.nombre);
    
    const idRetiroComunidad = retiroId || config?.equipo_id || "general";
    const codigoComunidadFinal = codigoComunidadParam || config?.codigo_comunidad || config?.codigo || config?.slug || idRetiroComunidad;

    // 🔒 PAYLOAD SINCRONIZADO CON CÓDIGO ÚNICO DE COMUNIDAD
    const payload = {
      ...form,
      tipo: "Servidor",
      rol: "Servidor",
      rol_servidor: form.lugares_servido || "Servidor",
      genero: generoFijo || form.genero,
      edad: Number(form.edad),
      numero_retiro: config?.edicion ? Number(String(config.edicion).replace(/\D/g, "")) || 1 : 1,
      
      // 🔒 CÓDIGO UNIFICADO Y MULTI-IDENTIFICADORES DE COMUNIDAD
      codigo_comunidad: codigoComunidadFinal,
      comunidad_codigo: codigoComunidadFinal,
      equipo_id: config?.equipo_id || idRetiroComunidad,
      comunidad_id: config?.comunidad_id || config?.equipo_id || idRetiroComunidad,
      retiro_id: idRetiroComunidad,
      comunidad_slug: idRetiroComunidad,
      comunidad_nombre: nombreComunidadReal,
      nombre_equipo: nombreComunidadReal,
      estado: "Pendiente",
    };
    
    Object.keys(payload).forEach(k => { 
      if (payload[k] === "" || payload[k] === undefined) delete payload[k]; 
    });
    
    try {
      await base44.functions.invoke("inscripcionPublica", payload);
      setEnviado(true);
    } catch (err) {
      setErrorEnvio("Error al procesar la solicitud: " + err.message);
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-blue-100">
          {config?.logo_url && <img src={config.logo_url} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-4 rounded-full bg-white shadow" />}
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-blue-900 mb-3">¡Solicitud de Servidor Enviada!</h2>
          <p className="text-gray-700 text-base mb-4 leading-relaxed font-medium">
            ✅ <strong>{nombreEnviado}</strong>, tu registro como servidor fue enviado correctamente para evaluación.
          </p>

          {/* 🟢 BOTÓN UNIRSE AL GRUPO DE WHATSAPP SI ESTÁ PROGRAMADO EN CONFIGURACIÓN */}
          {config?.grupo_whatsapp ? (
            <a
              href={config.grupo_whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-4 inline-flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all text-sm animate-pulse"
            >
              <MessageCircle className="w-5 h-5" /> Unirse al Grupo de WhatsApp de Servidores
            </a>
          ) : (
            <p className="text-xs text-slate-500 mb-4 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              ℹ️ Te contactaremos cuando se asigne el equipo de servicio para este retiro.
            </p>
          )}

          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 mb-4">
            <p className="text-blue-800 text-sm font-bold">✝ {nombreRetiro}</p>
            {config?.edicion && <p className="text-blue-700 text-xs mt-0.5 font-semibold">Retiro #{config.edicion}</p>}
            <p className="text-blue-600 text-xs mt-1 italic">{eslogan}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4 font-sans text-slate-800">
      <div className="max-w-2xl mx-auto mb-6 text-center">
        {config?.logo_url && <img src={config.logo_url} alt="Logo" className="w-20 h-20 object-contain mx-auto mb-3 rounded-full bg-white shadow" />}
        <h1 className="text-2xl font-bold text-blue-950 tracking-tight" style={{ fontFamily: "Georgia, serif" }}>✝ {nombreRetiro}</h1>
        {config?.edicion && <p className="text-blue-800 text-sm font-semibold">Retiro #{config.edicion}</p>}
        <p className="text-blue-600 text-xs mt-1 tracking-widest uppercase font-medium">{eslogan}</p>
        <div className="mt-3 inline-flex items-center gap-2 bg-blue-100 text-blue-900 px-4 py-2 rounded-full shadow-xs">
          <Heart className="w-4 h-4 text-blue-700" />
          <span className="text-sm font-bold">Inscripción de Servidores</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-5">
        <Card title="Información Personal del Servidor">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isCampoVisible("nombre") && (
              <div className="md:col-span-2">
                <label className={lbl}>Nombre Completo {isCampoObligatorio("nombre", true) && "*"}</label>
                <input className={`${inp} ${errores.nombre ? "border-red-400" : ""}`} value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Ej: María Fernández" />
                {errores.nombre && <p className="text-red-500 text-xs mt-1 font-semibold">{errores.nombre}</p>}
              </div>
            )}
            {isCampoVisible("cedula") && (
              <div>
                <label className={lbl}>Cédula / Documento {isCampoObligatorio("cedula", true) && "*"}</label>
                <input className={`${inp} ${errores.cedula ? "border-red-400" : ""}`} value={form.cedula} onChange={e => set("cedula", e.target.value)} placeholder="000-0000000-0" />
                {errores.cedula && <p className="text-red-500 text-xs mt-1 font-semibold">{errores.cedula}</p>}
              </div>
            )}
            {isCampoVisible("apodo") && (
              <div>
                <label className={lbl}>Apodo {isCampoObligatorio("apodo") && "*"}</label>
                <input className={inp} value={form.apodo} onChange={e => set("apodo", e.target.value)} placeholder="Nombre con el que te conocen" />
              </div>
            )}

            {/* 📅 FECHA DE NACIMIENTO Y EDAD AUTOMÁTICA BLOQUEADA */}
            {isCampoVisible("fecha_nacimiento") && (
              <div>
                <label className={lbl}>Fecha de Nacimiento {isCampoObligatorio("fecha_nacimiento", true) && "*"}</label>
                <input 
                  type="date" 
                  className={`${inp} ${errores.fecha_nacimiento ? "border-red-400" : ""}`} 
                  value={form.fecha_nacimiento} 
                  onChange={e => set("fecha_nacimiento", e.target.value)} 
                />
                {errores.fecha_nacimiento && <p className="text-red-500 text-xs mt-1 font-semibold">{errores.fecha_nacimiento}</p>}
              </div>
            )}

            {isCampoVisible("edad") && (
              <div>
                <label className={lbl}>Edad (Calculada automáticamente)</label>
                <input 
                  type="text" 
                  className={`${inp} bg-blue-50/80 font-bold text-blue-900 border-blue-200 cursor-not-allowed`} 
                  value={form.edad ? `${form.edad} años` : "Selecciona fecha nac."} 
                  readOnly 
                />
              </div>
            )}

            {/* 🧬 GÉNERO AUTOMÁTICO SEGÚN LA COMUNIDAD */}
            {isCampoVisible("genero") && (
              <div>
                <label className={lbl}>Género {isCampoObligatorio("genero", true) && "*"}</label>
                {generoFijo ? (
                  <div className={`${inp} bg-blue-50/80 font-bold text-blue-900 flex items-center justify-between border-blue-300`}>
                    <span>{generoFijo}</span>
                    <span className="text-blue-700 text-[11px] font-semibold">(Fijado por la comunidad)</span>
                  </div>
                ) : (
                  <MobileSelect className={`${inp} ${errores.genero ? "border-red-400" : ""}`} value={form.genero} onChange={(v) => set("genero", v)} options={[{ value: "", label: "Seleccionar..." }, "Masculino", "Femenino"]} />
                )}
                {errores.genero && <p className="text-red-500 text-xs mt-1 font-semibold">{errores.genero}</p>}
              </div>
            )}

            {isCampoVisible("telefono") && (
              <div>
                <label className={lbl}>Teléfono {isCampoObligatorio("telefono", true) && "*"} (809-000-0000)</label>
                <input className={`${inp} ${errores.telefono ? "border-red-400" : ""}`} value={form.telefono} onChange={e => set("telefono", e.target.value)} placeholder="809-000-0000" />
                {errores.telefono && <p className="text-red-500 text-xs mt-1 font-semibold">{errores.telefono}</p>}
              </div>
            )}

            {isCampoVisible("email") && (
              <div>
                <label className={lbl}>Correo Electrónico {isCampoObligatorio("email") && "*"}</label>
                <input 
                  type="email" 
                  className={`${inp} ${errores.email ? "border-red-400" : ""}`} 
                  value={form.email} 
                  onChange={e => set("email", e.target.value)} 
                  placeholder="ejemplo@correo.com" 
                />
                {errores.email && <p className="text-red-500 text-xs mt-1 font-semibold">{errores.email}</p>}
              </div>
            )}

            {isCampoVisible("estado_civil") && (
              <div>
                <label className={lbl}>Estado Civil {isCampoObligatorio("estado_civil") && "*"}</label>
                <MobileSelect className={inp} value={form.estado_civil} onChange={(v) => set("estado_civil", v)} options={[{ value: "", label: "Seleccionar..." }, "Soltero(a)", "Casado(a) por la Iglesia", "Casado(a) por lo Civil", "Unión Libre", "Divorciado(a)", "Viudo(a)"]} />
              </div>
            )}

            {/* ✍️ LUGAR DONDE HA SERVIDO (DIVIDIDO POR COMAS) */}
            <div className="md:col-span-2">
              <label className={lbl}>Lugar(es) o área(s) donde ha servido</label>
              <input 
                className={inp} 
                value={form.lugares_servido} 
                onChange={e => set("lugares_servido", e.target.value)} 
                placeholder="Ej: Cocina, Liturgia, Parroquia San José (separe con comas si son varias)" 
              />
              <p className="text-[11px] text-blue-700 mt-1 font-medium">💡 Si ha servido en varias áreas o parroquias, divídalas usando comas (,).</p>
            </div>

            {/* 🌐 UBICACIÓN ECLESIÁSTICA EN CASCADA COMPLETA MULTIPAÍS */}
            <div className="md:col-span-2 mt-2 pt-3 border-t border-blue-100">
              <label className="block text-sm font-bold text-blue-900 mb-2 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-700" /> Ubicación Eclesiástica y Dirección (Cascada Multipaís)
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. PAÍS */}
                {isCampoVisible("pais") && (
                  <div>
                    <label className={lbl}>País {isCampoObligatorio("pais", true) && "*"}</label>
                    <MobileSelect
                      className={`${inp} ${errores.pais ? "border-red-400" : ""}`}
                      value={form.pais}
                      onChange={handlePaisChange}
                      options={[{ value: "", label: "Seleccionar País..." }, ...PAISES_LIST.map(p => ({ value: p, label: p }))]}
                    />
                    {errores.pais && <p className="text-red-500 text-xs mt-1 font-semibold">{errores.pais}</p>}
                  </div>
                )}

                {/* 2. ESTADO / PROVINCIA */}
                {isCampoVisible("provincia") && (
                  <div>
                    <label className={lbl}>Estado / Provincia {isCampoObligatorio("provincia", true) && "*"}</label>
                    <MobileSelect
                      className={`${inp} ${errores.provincia ? "border-red-400" : ""}`}
                      value={form.provincia}
                      onChange={handleProvinciaChange}
                      disabled={!form.pais}
                      options={[
                        { value: "", label: !form.pais ? "Primero seleccione un país" : "Seleccionar Estado / Provincia..." },
                        ...estadosDisponibles.map(e => ({ value: e, label: e }))
                      ]}
                    />
                    {errores.provincia && <p className="text-red-500 text-xs mt-1 font-semibold">{errores.provincia}</p>}
                  </div>
                )}

                {/* 3. DIÓCESIS / ARQUIDIÓCESIS */}
                {isCampoVisible("diocesis") && (
                  <div>
                    <label className={lbl}>Diócesis / Arquidiócesis {isCampoObligatorio("diocesis", true) && "*"}</label>
                    <MobileSelect
                      className={`${inp} ${errores.diocesis ? "border-red-400" : ""}`}
                      value={form.diocesis}
                      onChange={handleDiocesisChange}
                      disabled={!form.provincia}
                      options={[
                        { value: "", label: !form.provincia ? "Primero seleccione una provincia" : "Seleccionar Diócesis..." },
                        ...diocesisDisponibles.map(d => ({ value: d, label: d }))
                      ]}
                    />
                    {errores.diocesis && <p className="text-red-500 text-xs mt-1 font-semibold">{errores.diocesis}</p>}
                  </div>
                )}

                {/* 4. PARROQUIA / CAPILLA */}
                {isCampoVisible("parroquia") && (
                  <div>
                    <label className={lbl}>Parroquia / Templo / Capilla {isCampoObligatorio("parroquia", true) && "*"}</label>
                    <MobileSelect
                      className={`${inp} ${errores.parroquia ? "border-red-400" : ""}`}
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
                    />
                    {errores.parroquia && <p className="text-red-500 text-xs mt-1 font-semibold">{errores.parroquia}</p>}
                  </div>
                )}

                {/* 5. MUNICIPIO / CIUDAD */}
                {isCampoVisible("direccion") && (
                  <div>
                    <label className={lbl}>Municipio / Ciudad</label>
                    <input className={inp} value={form.municipio} onChange={e => set("municipio", e.target.value)} placeholder="Municipio o Ciudad" />
                  </div>
                )}

                {/* 6. SECTOR */}
                {isCampoVisible("direccion") && (
                  <div>
                    <label className={lbl}>Sector / Barrio</label>
                    <input className={inp} value={form.sector} onChange={e => set("sector", e.target.value)} placeholder="Ej: Bella Vista" />
                  </div>
                )}

                {/* 7. CALLE / NÚMERO */}
                {isCampoVisible("direccion") && (
                  <div className="md:col-span-2">
                    <label className={lbl}>Calle / Número / Residencia</label>
                    <input className={inp} value={form.calle} onChange={e => set("calle", e.target.value)} placeholder="Ej: Calle Principal #12, Edif. A, Apt 3B" />
                  </div>
                )}
              </div>
            </div>

            {/* 🚑 CONTACTO DE EMERGENCIA */}
            <div className="md:col-span-2 mt-2 pt-3 border-t border-blue-100">
              <label className="block text-sm font-bold text-blue-900 mb-2">Contacto de Emergencia</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {isCampoVisible("contacto_emergencia") && (
                  <div>
                    <label className={lbl}>Nombre {isCampoObligatorio("contacto_emergencia", true) && "*"}</label>
                    <input className={`${inp} ${errores.contacto_emergencia ? "border-red-400" : ""}`} value={form.contacto_emergencia} onChange={e => set("contacto_emergencia", e.target.value)} placeholder="Nombre completo" />
                    {errores.contacto_emergencia && <p className="text-red-500 text-xs mt-1 font-semibold">{errores.contacto_emergencia}</p>}
                  </div>
                )}
                {isCampoVisible("relacion_emergencia") && (
                  <div>
                    <label className={lbl}>Relación {isCampoObligatorio("relacion_emergencia") && "*"}</label>
                    <input className={inp} value={form.relacion_emergencia} onChange={e => set("relacion_emergencia", e.target.value)} placeholder="Ej: Esposa, Hermano" />
                  </div>
                )}
                {isCampoVisible("telefono_emergencia") && (
                  <div>
                    <label className={lbl}>Teléfono {isCampoObligatorio("telefono_emergencia") && "*"} (809-000-0000)</label>
                    <input className={inp} value={form.telefono_emergencia} onChange={e => set("telefono_emergencia", e.target.value)} placeholder="809-000-0000" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* 🏥 COTEJO SÍ / NO PARA NECESIDADES MÉDICAS */}
        {isCampoVisible("necesidades_medicas") && (
          <Card title="Condición Médica y Alergias">
            <div className="space-y-3">
              <label className="block text-sm font-bold text-blue-900">¿Padece alguna enfermedad, alergia o condición médica especial? {isCampoObligatorio("necesidades_medicas") && "*"}</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => abrirModalSalud("SI")}
                  className={`py-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    tieneNecesidadMedica === "SI" 
                      ? "bg-blue-800 text-white border-blue-800 shadow-md" 
                      : "bg-white text-blue-900 border-blue-200 hover:bg-blue-50"
                  }`}
                >
                  <Check className="w-4 h-4" /> SÍ (Especificar)
                </button>

                <button
                  type="button"
                  onClick={() => abrirModalSalud("NO")}
                  className={`py-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    tieneNecesidadMedica === "NO" 
                      ? "bg-slate-100 text-slate-800 border-slate-300 font-bold" 
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <X className="w-4 h-4" /> NO
                </button>
              </div>

              {tieneNecesidadMedica === "SI" && form.necesidades_medicas && (
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between text-xs text-blue-900">
                  <p className="font-semibold"><strong>Detalle:</strong> {form.necesidades_medicas}</p>
                  <button type="button" onClick={() => setModalMedicaOpen(true)} className="text-blue-700 font-bold underline ml-2">
                    Editar
                  </button>
                </div>
              )}
            </div>
          </Card>
        )}

        {errorEnvio && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm font-semibold">⚠️ {errorEnvio}</div>}

        <button type="submit" disabled={enviando}
          className="w-full bg-blue-800 hover:bg-blue-900 text-white py-3.5 rounded-xl font-bold text-base transition-colors shadow-lg flex items-center justify-center gap-2">
          {enviando ? <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</> : "Enviar Solicitud de Servidor"}
        </button>
        <div className="pb-8" />
      </form>

      {/* 🏥 MODAL DE REDACCIÓN DE CONDICIÓN MÉDICA */}
      {modalMedicaOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 border border-blue-100">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-blue-900 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-700" /> Detalle de Condición Médica / Alergias
              </h3>
              <button onClick={() => setModalMedicaOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <textarea
              rows={4}
              value={textoMedicoTemp}
              onChange={e => setTextoMedicoTemp(e.target.value)}
              placeholder="Escriba medicamentos, alergias o condiciones de salud..."
              className="w-full border border-blue-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none bg-white font-medium"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModalMedicaOpen(false)} className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-700">Cancelar</button>
              <button type="button" onClick={guardarSaludModal} className="px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-xs">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-xl shadow-xs border border-blue-100 p-5">
      <h3 className="text-sm font-bold text-blue-900 mb-4 border-b border-blue-100 pb-2">{title}</h3>
      {children}
    </div>
  );
}

function RenderCamposPersonalizados({ configCamposMap, form, setForm, errores, lbl, inp, categoria }) {
  if (!configCamposMap) return null;
  const customFields = Object.entries(configCamposMap).filter(([k, cfg]) => {
    if (!k.startsWith("custom_") && !cfg?.esCustom) return false;
    if (!cfg?.activo) return false;
    if (categoria && cfg.cat !== categoria) return false;
    return true;
  });

  if (customFields.length === 0) return null;

  return (
    <>
      {customFields.map(([key, cfg]) => (
        <div key={key} className={cfg.type === "textarea" ? "md:col-span-2" : ""}>
          <label className={lbl}>
            {cfg.label} {cfg.obligatorio && <span className="text-red-500">*</span>}
          </label>

          {cfg.type === "boolean" ? (
            <MobileSelect
              className={`${inp} ${errores?.[key] ? "border-red-400" : ""}`}
              value={form[key] || ""}
              onChange={(v) => setForm(f => ({ ...f, [key]: v }))}
              options={[{ value: "", label: "Seleccionar..." }, "Sí", "No"]}
            />
          ) : cfg.type === "select" ? (
            <MobileSelect
              className={`${inp} ${errores?.[key] ? "border-red-400" : ""}`}
              value={form[key] || ""}
              onChange={(v) => setForm(f => ({ ...f, [key]: v }))}
              options={[{ value: "", label: "Seleccionar..." }, ...(cfg.options || [])]}
            />
          ) : (
            <input
              type={cfg.type === "number" ? "number" : "text"}
              className={`${inp} ${errores?.[key] ? "border-red-400" : ""}`}
              value={form[key] || ""}
              onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
              placeholder={`Ingresa ${cfg.label.toLowerCase()}...`}
            />
          )}
          {errores?.[key] && <p className="text-red-500 text-xs mt-1 font-semibold">{errores[key]}</p>}
        </div>
      ))}
    </>
  );
}