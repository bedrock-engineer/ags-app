export function Header() {
  return (
    <header className="flex items-center justify-between gap-4 px-3 py-2 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-3">
        <a href="https://bedrock.engineer" className="flex items-center gap-2">
          <img src="/bedrock.svg" alt="Bedrock.engineer" className="h-7 w-7" />
        </a>
        <div>
          <h1 className="text-base font-semibold leading-tight">
            AGS file viewer
          </h1>
          <p className="text-xs text-gray-500 leading-tight">
            AGS3 and AGS4 ground investigation data, parsed in your browser.
            Nothing is uploaded.
          </p>
        </div>
      </div>
      <nav className="flex items-center gap-3 text-sm text-gray-600">
        <a href="https://bro.bedrock.engineer" className="hover:text-gray-900">
          BRO/XML viewer
        </a>
        <a
          href="https://github.com/bedrock-engineer/ags-app"
          className="hover:text-gray-900"
        >
          GitHub
        </a>
      </nav>
    </header>
  );
}
