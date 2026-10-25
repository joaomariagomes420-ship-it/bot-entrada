// index.js — Bot de boas-vindas com embed (discord.js v14)
// Para rodar: node index.js

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  PermissionFlagsBits,
} = require('discord.js');

// No seu PC: lê o DISCORD_TOKEN do arquivo .env. Na hospedagem (Render) não existe .env:
// o token vem das "Environment Variables" do painel, então este passo é simplesmente ignorado.
const arquivoEnv = path.join(__dirname, '.env');
if (fs.existsSync(arquivoEnv)) process.loadEnvFile(arquivoEnv);

// ───────────────── CONFIGURAÇÃO (edite só aqui) ─────────────────
const CONFIG = {
  // ID do canal onde a mensagem de boas-vindas vai aparecer.
  // Como pegar: Discord > Configurações > Avançado > ligue o "Modo desenvolvedor",
  // depois clique com o botão direito no canal > "Copiar ID do canal".
  canalBoasVindas: 'COLE_O_ID_DO_CANAL_AQUI',

  cor: 0xd4a017, // cor da barrinha ao lado do embed (hexadecimal)

  titulo: '⛩️ BEM-VINDO A BRAW HALLA RPG',

  // Texto da mensagem. {@user} vira a menção de quem entrou; <#ID> vira a menção de um canal.
  // Pode trocar o texto à vontade (só não use o símbolo ` nem ${ dentro dele).
  descricao: `⚔️ O guerreiro {@user} acaba de chegar ao reino!

🌑 Sua jornada começa agora. Evolua, conquiste poder e prove seu valor nas batalhas.

🔥 Supere seus limites e suba na hierarquia dos guerreiros.

👑 *Somente os mais fortes alcançarão o título de Lenda de Valhalla.*

━━━━━━━━━━━━━━━━━━━━

📜 Leia as regras: <#1561245705274789969>
📢 Fique por dentro: <#1561255838746808400>
⚔️ Conheça o jogo: <#1561246063749238846>

**Que os deuses testemunhem sua ascensão!** 🐺`,

  rodape: '', // texto pequeno no fim do embed (opcional). Deixe '' para não ter.

  // As imagens ficam na pasta "imagens" (ao lado deste index.js).
  // O nome tem que ser IGUAL ao do arquivo: maiúsculas, minúsculas e extensão (.png, .jpg, .gif).
  imagens: {
    banner: 'banner.png', // imagem grande embaixo do texto. Use null para não ter.
    miniatura: null, // imagem pequena no canto superior direito. Ex.: 'miniatura.png'
  },

  // Botões de link (opcional, máximo de 5). Exemplo:
  // links: [{ nome: 'YouTube', url: 'https://youtube.com/@seucanal' }],
  links: [],
};
// ─────────────────────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // necessário para saber quando alguém entra (ligue no Developer Portal)
  ],
});

// Pega uma imagem da pasta "imagens". Se o arquivo não existir, avisa no log e segue sem ela.
function anexarImagem(nome) {
  if (!nome) return null;

  const caminho = path.join(__dirname, 'imagens', nome);
  if (!fs.existsSync(caminho)) {
    console.warn(`⚠️ Não achei "imagens/${nome}". A mensagem vai sair sem essa imagem.`);
    return null;
  }

  return new AttachmentBuilder(caminho, { name: nome });
}

// Monta a mensagem completa: menção + embed + imagens (+ botões, se tiver)
function montarBoasVindas(member) {
  const { imagens } = CONFIG;
  const banner = anexarImagem(imagens.banner);
  const miniatura = anexarImagem(imagens.miniatura);

  const embed = new EmbedBuilder()
    .setColor(CONFIG.cor)
    .setTitle(CONFIG.titulo)
    .setDescription(CONFIG.descricao.replaceAll('{@user}', `${member}`));

  if (banner) embed.setImage(`attachment://${imagens.banner}`);
  if (miniatura) embed.setThumbnail(`attachment://${imagens.miniatura}`);
  if (CONFIG.rodape) embed.setFooter({ text: CONFIG.rodape });

  const mensagem = {
    content: `${member}`, // menção fora do embed: é ela que notifica a pessoa
    embeds: [embed],
    files: [banner, miniatura].filter(Boolean),
    allowedMentions: { users: [member.id] }, // só pinga o membro que entrou
  };

  if (CONFIG.links.length > 0) {
    mensagem.components = [
      new ActionRowBuilder().addComponents(
        CONFIG.links.map(({ nome, url }) =>
          new ButtonBuilder().setLabel(nome).setURL(url).setStyle(ButtonStyle.Link),
        ),
      ),
    ];
  }

  return mensagem;
}

// Alguém entrou no servidor → envia a mensagem no canal de boas-vindas
client.on(Events.GuildMemberAdd, async (member) => {
  if (member.user.bot) return; // não dá boas-vindas para outros bots

  const canal = member.guild.channels.cache.get(CONFIG.canalBoasVindas);
  if (!canal?.isTextBased()) {
    console.warn('Canal de boas-vindas não encontrado. Confira o ID em CONFIG.canalBoasVindas.');
    return;
  }

  try {
    await canal.send(montarBoasVindas(member));
  } catch (erro) {
    console.error('Não consegui enviar a mensagem de boas-vindas:', erro);
  }
});

// Bot ligou → registra o comando de teste /testar-boas-vindas
client.once(Events.ClientReady, async (bot) => {
  console.log(`✅ Online como ${bot.user.tag}`);

  for (const guild of bot.guilds.cache.values()) {
    try {
      await guild.commands.set([
        {
          name: 'testar-boas-vindas',
          description: 'Mostra a mensagem de boas-vindas como se você tivesse acabado de entrar',
          defaultMemberPermissions: PermissionFlagsBits.ManageGuild, // só quem gerencia o servidor usa
        },
      ]);
    } catch (erro) {
      console.error(`Não consegui registrar o comando em "${guild.name}". Convidou o bot com o escopo applications.commands?`, erro);
    }
  }
});

// Alguém usou /testar-boas-vindas → mostra a mensagem para a própria pessoa
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'testar-boas-vindas') return;

  try {
    await interaction.reply(montarBoasVindas(interaction.member));
  } catch (erro) {
    console.error('Erro ao testar a mensagem:', erro);
  }
});

if (!process.env.DISCORD_TOKEN) {
  console.error('❌ Faltou o DISCORD_TOKEN. No Render: aba Environment > Add Environment Variable.');
  process.exit(1);
}

// Servidor HTTP mínimo. O plano grátis do Render só tem "Web Service", e ele exige uma porta aberta.
// Também é esse endereço que o UptimeRobot visita a cada 5 minutos para o Render não "dormir" o bot.
http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bot online ✅');
  })
  .listen(process.env.PORT || 3000, '0.0.0.0');

client.login(process.env.DISCORD_TOKEN).catch((erro) => {
  console.error('❌ Não consegui entrar no Discord:', erro.message);
  process.exit(1);
});
