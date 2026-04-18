const bcrypt = require('bcrypt');

async function generarTodas() {
    const passwords = [
        { usuario: "Admin", password: "Admin2026!" },
        { usuario: "Lilliam", password: "Lilliam755!" },
        { usuario: "Sara", password: "Sara1040!" },
        { usuario: "Noelia", password: "Noelia5678!" }
    ];
    
    for (const p of passwords) {
        const hash = await bcrypt.hash(p.password, 10);
        console.log(`${p.usuario}:`);
        console.log(`   Password: ${p.password}`);
        console.log(`   Hash: ${hash}\n`);
    }
}

generarTodas();