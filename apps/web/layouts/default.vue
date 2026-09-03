<template>
  <div class="min-h-screen flex flex-col">
    <Navbar />

    <main class="mx-auto w-full max-w-5xl flex-1 px-4 pb-8 pt-24 sm:px-6 sm:pb-12 sm:pt-28">
      <slot />
    </main>

    <LayoutSiteFooter />
  </div>
</template>
