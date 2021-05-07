import parse from './parse';
import {
  CheerioOptions,
  InternalOptions,
  default as defaultOptions,
  flatten as flattenOptions,
} from './options';
import { isHtml, isCheerio } from './utils';
import type { Node, Document, Element } from 'domhandler';
import * as Static from './static';
import type * as Load from './load';
import { SelectorType, BasicAcceptedElems } from './types';

import * as Attributes from './api/attributes';
import * as Traversing from './api/traversing';
import * as Manipulation from './api/manipulation';
import * as Css from './api/css';
import * as Forms from './api/forms';

type AttributesType = typeof Attributes;
type TraversingType = typeof Traversing;
type ManipulationType = typeof Manipulation;
type CssType = typeof Css;
type FormsType = typeof Forms;

type StaticType = typeof Static;
type LoadType = typeof Load;

/*
 * The API
 */
const api = [Attributes, Traversing, Manipulation, Css, Forms];

export class Cheerio<T> implements ArrayLike<T> {
  length = 0;
  [index: number]: T;

  options!: InternalOptions;
  /**
   * The root of the document. Can be overwritten by using the `root` argument
   * of the constructor.
   *
   * @private
   */
  _root: Cheerio<Document> | undefined;
  /** @function */
  find!: typeof Traversing.find;

  /**
   * The root the document was originally loaded with. Set in `.load`.
   *
   * @private
   */
  static _root: Document | undefined;
  /**
   * The options the document was originally loaded with. Set in `.load`.
   *
   * @private
   */
  static _options: InternalOptions | undefined;
  public static html = Static.html;
  public static xml = Static.xml;
  public static text = Static.text;
  public static parseHTML = Static.parseHTML;
  public static root = Static.root;
  public static contains = Static.contains;
  public static merge = Static.merge;
  public static load: typeof Load.load;

  /** Mimic jQuery's prototype alias for plugin authors. */
  public static fn = Cheerio.prototype;

  /**
   * Instance of cheerio. Methods are specified in the modules. Usage of this
   * constructor is not recommended. Please use $.load instead.
   *
   * @private
   * @param selector - The new selection.
   * @param context - Context of the selection.
   * @param root - Sets the root node.
   * @param options - Options for the instance.
   */
  constructor(
    selector?: T extends Node ? BasicAcceptedElems<T> : Cheerio<T> | T[],
    context?: BasicAcceptedElems<Node> | null,
    root?: BasicAcceptedElems<Document> | null,
    options?: CheerioOptions
  ) {
    this.options = {
      ...defaultOptions,
      ...flattenOptions(options),
    };

    // $(), $(null), $(undefined), $(false)
    if (!selector) return this;

    if (root) {
      if (typeof root === 'string') root = parse(root, this.options, false);
      this._root = new (this.constructor as typeof Cheerio)(root, null, null);
    }

    // $($)
    if (isCheerio<T>(selector)) return selector;

    const elements =
      typeof selector === 'string' && isHtml(selector)
        ? // $(<html>)
          parse(selector, this.options, false).children
        : isNode(selector)
        ? // $(dom)
          [selector]
        : Array.isArray(selector)
        ? // $([dom])
          selector
        : null;

    if (elements) {
      elements.forEach((elem, idx) => {
        this[idx] = elem;
      });
      this.length = elements.length;
      return this;
    }

    // We know that our selector is a string now.
    let search = selector as string;

    const searchContext: Cheerio<Node> | undefined = !context
      ? // If we don't have a context, maybe we have a root, from loading
        this._root
      : typeof context === 'string'
      ? isHtml(context)
        ? // $('li', '<ul>...</ul>')
          this._make(parse(context, this.options, false))
        : // $('li', 'ul')
          ((search = `${context} ${search}`), this._root)
      : isCheerio(context)
      ? // $('li', $)
        context
      : // $('li', node), $('li', [nodes])
        this._make(context);

    // If we still don't have a context, return
    if (!searchContext) return this;

    /*
     * #id, .class, tag
     */
    // @ts-expect-error No good way to type this — we will always return `Cheerio<Element>` here.
    return searchContext.find(search);
  }

  prevObject: Cheerio<Node> | undefined;
  /**
   * Make a cheerio object.
   *
   * @private
   * @param dom - The contents of the new object.
   * @param context - The context of the new object.
   * @returns The new cheerio object.
   */
  _make<T>(
    dom: Cheerio<T> | T[] | T | string,
    context?: BasicAcceptedElems<Node> | null
  ): Cheerio<T> {
    const cheerio = new (this.constructor as any)(
      dom,
      context,
      undefined,
      this.options
    );
    cheerio.prevObject = this;

    return cheerio;
  }
}

export interface Cheerio<T>
  extends AttributesType,
    TraversingType,
    ManipulationType,
    CssType,
    FormsType {
  cheerio: '[cheerio object]';

  splice: typeof Array.prototype.slice;
  [Symbol.iterator](): Iterator<T>;
}

/** Set a signature of the object. */
Cheerio.prototype.cheerio = '[cheerio object]';

/*
 * Make cheerio an array-like object
 */
Cheerio.prototype.splice = Array.prototype.splice;

// Support for (const element of $(...)) iteration:
Cheerio.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];

// Plug in the API
api.forEach((mod) => Object.assign(Cheerio.prototype, mod));

function isNode(obj: any): obj is Node {
  return (
    !!obj.name ||
    obj.type === 'root' ||
    obj.type === 'text' ||
    obj.type === 'comment'
  );
}

/**
 * Wrapper around the `Cheerio` class, making it possible to create a new
 * instance without using `new`.
 */
export interface CheerioAPI extends StaticType, LoadType {
  <T extends Node, S extends string>(
    selector?: S | BasicAcceptedElems<T>,
    context?: BasicAcceptedElems<Node> | null,
    root?: BasicAcceptedElems<Document>,
    options?: CheerioOptions
  ): Cheerio<S extends SelectorType ? Element : T>;

  /**
   * The root the document was originally loaded with. Set in `.load`.
   *
   * @private
   */
  _root: Document | undefined;

  /**
   * The options the document was originally loaded with. Set in `.load`.
   *
   * @private
   */
  _options: InternalOptions | undefined;
}

// Make it possible to call Cheerio without using `new`.
export default (Cheerio as unknown) as CheerioAPI;
