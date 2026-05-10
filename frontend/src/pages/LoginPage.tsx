import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Key } from 'lucide-react';
import { useAuth } from '@/hooks';
import Logo from '@/components/Logo';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login, logout, changePassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!username.trim() || !password.trim()) {
      setError('Vul alle velden in');
      setIsLoading(false);
      return;
    }

    try {
      const response = await login({ username, password });
      
      // Direct check uit de API response
      if (response.data.must_change_password) {
        setShowPasswordForm(true);  // Toon wachtwoord-form
      } else {
        navigate(from, { replace: true });  // Normale redirect
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Inloggen mislukt. Controleer je gebruikersnaam en wachtwoord.');
      } else {
        setError('Inloggen mislukt. Controleer je gebruikersnaam en wachtwoord.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (newPassword !== confirmNewPassword) {
      setError('Nieuwe wachtwoorden komen niet overeen');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError('Wachtwoord moet minstens 8 tekens bevatten');
      setIsLoading(false);
      return;
    }

    try {
      await changePassword({ new_password: newPassword });
      // Succes: redirect naar login (geen logout nodig, token is nog geldig maar otp=0)
      window.location.href = '/login';
    } catch (err) {
      setError('Fout bij wijzigen wachtwoord. Probeer het opnieuw.');
      setIsLoading(false);
    }
  };

  const handleCancelPasswordChange = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Toon wachtwoord-wijzigscherm
  if (showPasswordForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="mx-auto mb-4">
                <Key className="w-10 h-10 text-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Wachtwoord wijzigen</h1>
              <p className="text-gray-500 mt-2">
                Je moet je wachtwoord wijzigen voor de eerste keer.
              </p>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="relative">
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Nieuw wachtwoord
                </label>
                <input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-12"
                  placeholder="Nieuw wachtwoord (min. 8 tekens)"
                  minLength={8}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="relative">
                <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Bevestig nieuw wachtwoord
                </label>
                <input
                  id="confirmNewPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-12"
                  placeholder="Bevestig nieuw wachtwoord"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleCancelPasswordChange}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  disabled={isLoading}
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !newPassword.trim() || !confirmNewPassword.trim()}
                  className="flex-1 bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Wachtwoord wijzigen...
                    </>
                  ) : (
                    'Wachtwoord wijzigen'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Normaal login scherm
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4">
              <Logo className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Nifty CalDAV</h1>
            <p className="text-gray-500 mt-2">Log in om door te gaan</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Gebruikersnaam
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Gebruikersnaam"
                disabled={isLoading}
              />
            </div>

            <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Wachtwoord
              </label>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-12"
                placeholder="Wachtwoord"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || !username.trim() || !password.trim()}
              className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Inloggen...
                </>
              ) : (
                'Inloggen'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Eerste keer? Neem contact op met de beheerder.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
