const SUPABASE_URL = "https://ecxpqfjhgmmrlkwvfwcb.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable__kEK59Xeoo9jxoMgHNY3Kw_1r2D40rg";

const clienteSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);






const loginForm =
    document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            const email =
                document.getElementById("email").value;

            const senha =
                document.getElementById("senha").value;

            const { data, error } =
                await clienteSupabase.auth.signInWithPassword({
                    email: email,
                    password: senha
                });

            if (error) {

                console.error(error);

                document.getElementById("mensagem").textContent =
                    "E-mail ou senha incorretos.";

                return;
            }

            console.log(data);

            window.location.href =
                "painel.html";
        }
    );
}

