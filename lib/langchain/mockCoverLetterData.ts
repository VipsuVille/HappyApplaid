// lib/langchain/mockCoverLetterData.ts
import { CoverLetter } from '@/types';

export const mockCoverLetterData = {
  professional: {
    letter_data: {
      name: "Matti Meikäläinen",
      email: "matti.meikalainen@example.com",
      phone: "040 123 4567",
      address: "Esimerkkikatu 1, 00100 Helsinki"
    },
    ai_data: {
      html: {
        content: `<div style="padding: 20px;">
          <div style="margin-bottom: 20px;">
            <p>Matti Meikäläinen<br>
            Esimerkkikatu 1<br>
            00100 Helsinki<br>
            Puh: 040 123 4567<br>
            Sähköposti: matti.meikalainen@example.com</p>
          </div>
          
          <p>Helsinki, ${new Date().toLocaleDateString('fi-FI')}</p>
          
          <div style="margin-bottom: 20px;">
            <p>Vastaanottajan nimi<br>
            Yrityksen nimi<br>
            Yrityksen osoite</p>
          </div>
          
          <p><strong>TYÖHAKEMUS: AVOIN TYÖTEHTÄVÄ</strong></p>
          
          <p>Arvoisa vastaanottaja,</p>
          
          <p>Haen ilmoittamaanne työtehtävää kiinnostuneena mahdollisuudesta työskennellä organisaatiossanne. Olen koulutukseltani [tutkinto] ja minulla on [X] vuoden kokemus [alalta/tehtävistä].</p>
          
          <p>Aikaisemmissa työtehtävissäni olen saavuttanut tuloksia [kerro esimerkki saavutuksesta tai tuloksesta]. Olen kehittänyt erityisesti [taitoja], joiden uskon olevan hyödyllisiä myös tässä tehtävässä. Olen tunnettu [positiivisesta ominaisuudesta] ja kyvystäni [toinen vahvuus].</p>
          
          <p>Odotan innolla mahdollisuutta keskustella kanssanne siitä, miten voisin tuoda osaamiseni ja kokemukseni organisaationne hyödyksi. Olen tavoitettavissa sähköpostitse tai puhelimitse sopiaksemme mahdollisesta haastattelusta.</p>
          
          <p>Ystävällisin terveisin,<br><br>
          Matti Meikäläinen</p>
        </div>`
      },
      styles: {
        main_style: "font-family: Arial, sans-serif; color: #333; line-height: 1.5;"
      },
      title: "Ammattimainen hakukirje"
    }
  },
  creative: {
    letter_data: {
      name: "Matti Meikäläinen",
      email: "matti.meikalainen@example.com",
      phone: "040 123 4567",
      address: "Esimerkkikatu 1, 00100 Helsinki"
    },
    ai_data: {
      html: {
        content: `<div style="padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4a90e2; font-size: 24px;">MATTI MEIKÄLÄINEN</h1>
            <p>Luova tekijä • Innovaattori • Visionääri</p>
            <p>040 123 4567 • matti.meikalainen@example.com</p>
          </div>
          
          <p>Hei tulevaisuuteni tekijä!</p>
          
          <p>Kun näin työpaikkailmoituksenne, tiesin heti, että tässä on jotain erityistä. Kuin tähdistä kirjoitettu kartta, se osoitti suoraan minuun ja taitoihini. Kerron miksi näin on.</p>
          
          <p>Kuvitellaan hetki, että olen jo osa tiimiänne. Mitä näet? Innostuneen ammattilaisen, joka tuo pöytään ei vain [X] vuoden kokemuksen, vaan myös tuoreen näkökulman, jota etsitte. Siinä missä muut näkevät haasteita, minä näen portaaleja uusiin mahdollisuuksiin.</p>
          
          <p>Erään projektini aikana [kerro tarina konkreettisesta saavutuksesta]. Tämä kokemus opetti minulle, että luovuus ja analyyttinen ajattelu kulkevat käsi kädessä, eivätkä ole toistensa vastakohtia.</p>
          
          <p>Odotan innolla mahdollisuutta keskustella siitä, miten voisin tuoda ainutlaatuisen sekoitukseni [taitoja ja ominaisuuksia] yrityksenne käyttöön ja yhdessä luoda jotain merkityksellistä.</p>
          
          <p>Inspiroitunein terveisin,<br><br>
          Matti Meikäläinen</p>
        </div>`
      },
      styles: {
        main_style: "font-family: 'Georgia', serif; color: #333; line-height: 1.6; background-color: #fafafa;"
      },
      title: "Luova hakukirje"
    }
  },
  technical: {
    letter_data: {
      name: "Matti Meikäläinen",
      email: "matti.meikalainen@example.com",
      phone: "040 123 4567",
      address: "Esimerkkikatu 1, 00100 Helsinki"
    },
    ai_data: {
      html: {
        content: `<div style="padding: 20px;">
          <div style="border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 18px;">MATTI MEIKÄLÄINEN</h1>
            <p style="margin: 5px 0 0 0;">
              <span style="font-family: monospace;">P: 040 123 4567</span> | 
              <span style="font-family: monospace;">E: matti.meikalainen@example.com</span> |
              <span style="font-family: monospace;">GitHub: github.com/mattidev</span>
            </p>
          </div>
          
          <div style="margin-bottom: 15px;">
            <p><strong>${new Date().toLocaleDateString('fi-FI')}</strong></p>
            <p>[Yrityksen nimi]<br>[Osasto/Tiimi]</p>
          </div>
          
          <p>Aihe: Hakemus [työtehtävän nimi] positioon</p>
          
          <p>Arvoisa rekrytoija,</p>
          
          <p>Haen [työtehtävä] positiota, jonka näin ilmoitettuna [lähde]. Tämänhetkisen [X vuoden] kokemukseni aikana olen keskittynyt teknologioihin kuten [teknologiat] ja kehittänyt järjestelmiä, jotka [konkreettinen saavutus tai hyöty].</p>
          
          <p>Tekninen osaamiseni:</p>
          <ul style="list-style-type: none; padding-left: 10px;">
            <li>• <strong>Ohjelmointikielet:</strong> JavaScript/TypeScript, Python, Java</li>
            <li>• <strong>Frameworkit:</strong> React, Node.js, Express</li>
            <li>• <strong>Työkalut:</strong> Git, Docker, CI/CD, AWS</li>
            <li>• <strong>Metodologiat:</strong> Agile, Scrum, TDD</li>
          </ul>
          
          <p>Viimeisimmässä projektissani [projektin nimi/kuvaus] vastuullani oli [vastuualue], joka johti [mitattava tulos tai parannus]. Tämä osoittaa kykyni tuottaa skaalautuvia ja tehokkaita ratkaisuja monimutkaisiin teknisiin haasteisiin.</p>
          
          <p>Odotan mahdollisuutta keskustella siitä, miten voisin hyödyntää teknistä osaamistani yrityksessänne. Olen käytettävissä haastatteluun parhaiten sopivana ajankohtana.</p>
          
          <p>Ystävällisin terveisin,<br><br>
          Matti Meikäläinen</p>
        </div>`
      },
      styles: {
        main_style: "font-family: 'Courier New', monospace; color: #222; line-height: 1.4;"
      },
      title: "Tekninen hakukirje"
    }
  }
} satisfies Record<string, CoverLetter>;