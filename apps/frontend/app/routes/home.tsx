export function meta() {
  return [
    { title: "CastMatch - AI-Powered Casting Platform" },
    {
      name: "description",
      content:
        "Discover, manage, and cast talent with AI assistance for Mumbai's entertainment industry.",
    },
  ];
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 pt-16 pb-32 sm:pt-24 lg:px-8 lg:pt-32">
          <div className="mx-auto max-w-2xl gap-x-14 lg:mx-0 lg:flex lg:max-w-none lg:items-center">
            <div className="w-full max-w-xl lg:shrink-0 xl:max-w-2xl">
              <h1 className="font-bold text-4xl text-gray-900 tracking-tight sm:text-6xl">
                AI-Powered Casting for Mumbai's{" "}
                <span className="text-primary-600">Entertainment Industry</span>
              </h1>
              <p className="relative mt-6 text-gray-600 text-lg leading-8 sm:max-w-md lg:max-w-none">
                Transform your casting process with intelligent talent discovery, automated workflow
                management, and AI-assisted decision making. Built specifically for Mumbai's OTT and
                film industry.
              </p>
              <div className="mt-10 flex items-center gap-x-6">
                <button
                  type="button"
                  className="rounded-md bg-primary-600 px-3.5 py-2.5 font-semibold text-sm text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2"
                >
                  Start Casting
                </button>
                <a href="#demo" className="font-semibold text-gray-900 text-sm leading-6">
                  Watch demo <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
            <div className="sm:-mt-44 mt-14 flex justify-end gap-8 sm:justify-start sm:pl-20 lg:mt-0 lg:pl-0">
              <div className="ml-auto w-44 flex-none space-y-8 pt-32 sm:ml-0 sm:pt-80 lg:order-last lg:pt-36 xl:order-none xl:pt-80">
                <div className="relative">
                  <img
                    src="https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&h=528&q=80"
                    alt="Actor headshot"
                    className="aspect-[2/3] w-full rounded-xl bg-gray-900/5 object-cover shadow-lg"
                  />
                  <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-gray-900/10 ring-inset" />
                </div>
              </div>
              <div className="mr-auto w-44 flex-none space-y-8 sm:mr-0 sm:pt-52 lg:pt-36">
                <div className="relative">
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&h=528&q=80"
                    alt="Actor headshot"
                    className="aspect-[2/3] w-full rounded-xl bg-gray-900/5 object-cover shadow-lg"
                  />
                  <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-gray-900/10 ring-inset" />
                </div>
                <div className="relative">
                  <img
                    src="https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&h=528&q=80"
                    alt="Actor headshot"
                    className="aspect-[2/3] w-full rounded-xl bg-gray-900/5 object-cover shadow-lg"
                  />
                  <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-gray-900/10 ring-inset" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="font-semibold text-base text-primary-600 leading-7">
            Intelligent Casting
          </h2>
          <p className="mt-2 font-bold text-3xl text-gray-900 tracking-tight sm:text-4xl">
            Everything you need to cast the perfect talent
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
            <div className="relative pl-16">
              <dt className="font-semibold text-base text-gray-900 leading-7">
                <div className="absolute top-0 left-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                    />
                  </svg>
                </div>
                AI-Powered Search
              </dt>
              <dd className="mt-2 text-base text-gray-600 leading-7">
                Find the perfect talent using natural language queries and intelligent matching
                algorithms.
              </dd>
            </div>
            <div className="relative pl-16">
              <dt className="font-semibold text-base text-gray-900 leading-7">
                <div className="absolute top-0 left-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.150 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c0 .621-.504 1.125-1.125 1.125H18a2.25 2.25 0 0 0 2.25-2.25M6 7.5h3v3H6v-3Z"
                    />
                  </svg>
                </div>
                Smart Project Management
              </dt>
              <dd className="mt-2 text-base text-gray-600 leading-7">
                Organize auditions, track applications, and manage your entire casting pipeline in
                one place.
              </dd>
            </div>
            <div className="relative pl-16">
              <dt className="font-semibold text-base text-gray-900 leading-7">
                <div className="absolute top-0 left-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
                    />
                  </svg>
                </div>
                Conversational AI Assistant
              </dt>
              <dd className="mt-2 text-base text-gray-600 leading-7">
                Chat with your AI assistant to get recommendations, insights, and help with casting
                decisions.
              </dd>
            </div>
            <div className="relative pl-16">
              <dt className="font-semibold text-base text-gray-900 leading-7">
                <div className="absolute top-0 left-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                    />
                  </svg>
                </div>
                Analytics & Insights
              </dt>
              <dd className="mt-2 text-base text-gray-600 leading-7">
                Track your casting success rates, identify trends, and optimize your selection
                process.
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* CTA Section */}
      <div className="mx-auto mt-32 max-w-7xl sm:mt-40 sm:px-6 lg:px-8">
        <div className="relative isolate overflow-hidden bg-gray-900 px-6 py-24 text-center shadow-2xl sm:rounded-3xl sm:px-16">
          <h2 className="mx-auto max-w-2xl font-bold text-3xl text-white tracking-tight sm:text-4xl">
            Ready to transform your casting process?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-gray-300 text-lg leading-8">
            Join Mumbai's leading casting directors and producers who are already using CastMatch to
            discover exceptional talent.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <button
              type="button"
              className="rounded-md bg-white px-3.5 py-2.5 font-semibold text-gray-900 text-sm shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            >
              Get started today
            </button>
            <a href="#learn-more" className="font-semibold text-sm text-white leading-6">
              Learn more <span aria-hidden="true">→</span>
            </a>
          </div>
          <svg
            viewBox="0 0 1024 1024"
            className="-z-10 -translate-x-1/2 absolute top-1/2 left-1/2 h-[64rem] w-[64rem] [mask-image:radial-gradient(closest-side,white,transparent)]"
            aria-hidden="true"
          >
            <circle
              cx={512}
              cy={512}
              r={512}
              fill="url(#827591b1-ce8c-4110-b064-7cb85a0b1217)"
              fillOpacity="0.7"
            />
            <defs>
              <radialGradient id="827591b1-ce8c-4110-b064-7cb85a0b1217">
                <stop stopColor="#7775D6" />
                <stop offset={1} stopColor="#E935C1" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  );
}
