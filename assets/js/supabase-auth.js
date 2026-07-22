window.FC_AUTH=(function(){
  function client(){return window.FC_SUPABASE?.client}
  async function signIn(email,password){
    if(!client()) throw new Error('Supabase no está configurado.');
    const {data,error}=await client().auth.signInWithPassword({email,password});if(error)throw error;return data;
  }
  async function signOut(){if(client())await client().auth.signOut()}
  async function session(){if(!client())return null;const {data}=await client().auth.getSession();return data.session}
  async function resetPassword(email,redirectTo){
    if(!client())throw new Error('Supabase no está configurado.');
    const {error}=await client().auth.resetPasswordForEmail(email,{redirectTo});if(error)throw error;return true;
  }
  return {signIn,signOut,session,resetPassword};
})();
