import { A, Route, Router, type RouteSectionProps } from '@solidjs/router';
import { For } from 'solid-js';
import { Gallery } from './routes/gallery.tsx';
import { Home } from './routes/home.tsx';
import { Share } from './routes/share.tsx';
import { galleryFilters, galleryPath } from './logic/gallery_filter.ts';
import './styles.css';

const Layout = (props: RouteSectionProps) => (
  <>
    <header class="site-header">
      <A href="/" class="brand">
        <strong>yellat</strong>
        <span class="tagline">Old man yells at &lt;thing&gt;</span>
      </A>
      <nav>
        <A href="/" end>
          Make
        </A>
        <A href="/gallery">Gallery</A>
      </nav>
    </header>
    <main>{props.children}</main>
    <footer class="site-footer">
      <p>Logos are combined in your browser. Nothing is uploaded unless you press Share.</p>
    </footer>
  </>
);

export const App = () => (
  <Router root={Layout}>
    <Route path="/" component={Home} />
    <For each={galleryFilters}>
      {(filter) => <Route path={galleryPath(filter)} component={() => <Gallery filter={filter} />} />}
    </For>
    <Route path="/i/:id" component={Share} />
  </Router>
);
